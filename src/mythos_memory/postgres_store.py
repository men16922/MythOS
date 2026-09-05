from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any, cast

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from mythos_core import (
    AssetRecord,
    Choice,
    Echo,
    LoopPhase,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    Scene,
    WorldEvent,
    WorldMemory,
)
from mythos_core.models import Actor, from_json_dict, to_json_dict

from .store import MythOSStore, StoreError

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # type: ignore[assignment]


class PostgresMythOSStore(MythOSStore):
    _pool: ConnectionPool[psycopg.Connection[dict[str, Any]]] | None = None

    def __init__(self, database_url: str | None = None) -> None:
        if load_dotenv is not None:
            load_dotenv()
        self.database_url = database_url or os.getenv(
            "DATABASE_URL", "postgresql://mythos:mythos@localhost:5432/mythos"
        )
        if PostgresMythOSStore._pool is None:
            PostgresMythOSStore._pool = ConnectionPool(
                conninfo=str(self.database_url),
                kwargs={"row_factory": dict_row},
                min_size=1,
                max_size=10,
                open=True,
                # Neon reaps ALL idle backends at once (AdminShutdown), leaving
                # multiple dead connections in the pool — a single reconnect
                # retry then just draws the next corpse (measured live 2026-07-14,
                # swallowed a choose turn). Verify liveness on checkout so
                # getconn never hands out a dead connection.
                check=ConnectionPool.check_connection,
            )
        self._connection: psycopg.Connection[dict[str, Any]] | None = None
        self._transaction_depth = 0

    def close(self) -> None:
        if self._connection is not None:
            if PostgresMythOSStore._pool is not None:
                PostgresMythOSStore._pool.putconn(self._connection)
            else:
                self._connection.close()
            self._connection = None

    @classmethod
    def close_pool(cls, timeout: float = 5.0) -> None:
        if cls._pool is not None:
            cls._pool.close(timeout=timeout)
            cls._pool = None

    def create_player(self, profile: PlayerProfile) -> None:
        self._execute(
            """
            INSERT INTO players (player_id, display_name, created_at, updated_at, traits)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (player_id) DO UPDATE SET
              display_name = EXCLUDED.display_name,
              updated_at = EXCLUDED.updated_at,
              traits = EXCLUDED.traits
            """,
            (
                profile.player_id,
                profile.display_name,
                profile.created_at,
                profile.updated_at,
                Jsonb(profile.traits),
            ),
        )

    def get_player(self, player_id: str) -> PlayerProfile | None:
        row = self._fetchone("SELECT * FROM players WHERE player_id = %s", (player_id,))
        if row is None:
            return None
        return self._player_from_row(row)

    def list_players(self) -> list[PlayerProfile]:
        rows = self._fetchall("SELECT * FROM players ORDER BY updated_at DESC, created_at DESC", ())
        return [self._player_from_row(row) for row in rows]

    @staticmethod
    def _player_from_row(row: dict[str, Any]) -> PlayerProfile:
        return PlayerProfile(
            player_id=row["player_id"],
            display_name=row["display_name"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            traits=row["traits"],
        )

    @staticmethod
    def _inventory_table_form(raw: Any) -> list[dict[str, Any]]:
        """loop.state._inventory(dict/str 혼재) → counted {item_id,quantity,equipped}."""
        if not isinstance(raw, list):
            return []
        counts: dict[str, int] = {}
        equipped: dict[str, bool] = {}
        order: list[str] = []
        for entry in raw:
            if isinstance(entry, dict):
                item_id = str(entry.get("id") or entry.get("item_id") or entry.get("name") or "")
                eq = bool(entry.get("equipped"))
            else:
                item_id = str(entry)
                eq = False
            if not item_id:
                continue
            if item_id not in counts:
                order.append(item_id)
            counts[item_id] = counts.get(item_id, 0) + 1
            equipped[item_id] = equipped.get(item_id, False) or eq
        return [{"item_id": i, "quantity": counts[i], "equipped": equipped[i]} for i in order]

    @staticmethod
    def _inventory_working_form(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """counted table rows → loop.state working list (id별 quantity 만큼 전개)."""
        working: list[dict[str, Any]] = []
        for row in rows:
            for _ in range(int(row.get("quantity", 1))):
                working.append({"id": row["item_id"], "equipped": bool(row.get("equipped"))})
        return working

    def save_loop(self, loop: LoopState) -> None:
        state = dict(loop.state)
        state["_active_echoes"] = [to_json_dict(echo) for echo in loop.active_echoes]
        # 인벤토리는 loop_inventory 테이블이 권위 — loops.state에서 분리해 저장한다.
        inventory_raw = state.pop("_inventory", None)
        self._execute(
            """
            INSERT INTO loops (
              loop_id, player_id, seed, phase, location_id, stability, tension,
              started_at, ended_at, state
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (loop_id) DO UPDATE SET
              phase = EXCLUDED.phase,
              location_id = EXCLUDED.location_id,
              stability = EXCLUDED.stability,
              tension = EXCLUDED.tension,
              ended_at = EXCLUDED.ended_at,
              state = EXCLUDED.state
            """,
            (
                loop.loop_id,
                loop.player_id,
                loop.seed,
                loop.phase.value,
                loop.location_id,
                loop.stability,
                loop.tension,
                loop.started_at,
                loop.ended_at,
                Jsonb(state),
            ),
        )
        # FK 충족을 위해 loops INSERT 이후에 동기화. 키 부재면(인벤토리 미로딩 save)
        # 테이블을 건드리지 않는다.
        if inventory_raw is not None:
            self.set_inventory(loop.loop_id, self._inventory_table_form(inventory_raw))

    def get_loop(self, loop_id: str) -> LoopState | None:
        row = self._fetchone("SELECT * FROM loops WHERE loop_id = %s", (loop_id,))
        if row is None:
            return None
        inv_rows = self.list_inventory(loop_id)
        if inv_rows:
            row["state"] = {
                **(row["state"] or {}),
                "_inventory": self._inventory_working_form(inv_rows),
            }
        return self._loop_from_row(row)

    def list_loops(self, player_id: str) -> list[LoopState]:
        rows = self._fetchall(
            "SELECT * FROM loops WHERE player_id = %s ORDER BY started_at DESC",
            (player_id,),
        )
        return [self._loop_from_row(row) for row in rows]

    def append_event(self, event: WorldEvent) -> None:
        self._execute(
            """
            INSERT INTO events (
              event_id, loop_id, turn_index, actor, action, result, state_delta, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                event.event_id,
                event.loop_id,
                event.turn_index,
                event.actor.value,
                event.action,
                event.result,
                Jsonb(event.state_delta),
                event.created_at,
            ),
        )

    def list_events(self, loop_id: str) -> list[WorldEvent]:
        rows = self._fetchall(
            "SELECT * FROM events WHERE loop_id = %s ORDER BY turn_index, created_at",
            (loop_id,),
        )
        return [
            WorldEvent(
                event_id=row["event_id"],
                loop_id=row["loop_id"],
                turn_index=row["turn_index"],
                actor=Actor(row["actor"]),
                action=row["action"],
                result=row["result"],
                state_delta=row["state_delta"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def save_scene(self, scene: Scene) -> None:
        self._execute(
            """
            INSERT INTO scenes (
              scene_id, loop_id, turn_index, title, location, narration,
              choices, visual_brief, created_at, objective, action_result, scene_type
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (loop_id, turn_index) DO UPDATE SET
              scene_id = EXCLUDED.scene_id,
              title = EXCLUDED.title,
              location = EXCLUDED.location,
              narration = EXCLUDED.narration,
              choices = EXCLUDED.choices,
              visual_brief = EXCLUDED.visual_brief,
              created_at = EXCLUDED.created_at,
              objective = EXCLUDED.objective,
              action_result = EXCLUDED.action_result,
              scene_type = EXCLUDED.scene_type
            """,
            (
                scene.scene_id,
                scene.loop_id,
                scene.turn_index,
                scene.title,
                scene.location,
                scene.narration,
                Jsonb([to_json_dict(choice) for choice in scene.choices]),
                scene.visual_brief,
                scene.created_at,
                scene.objective,
                scene.action_result,
                scene.scene_type,
            ),
        )

    def get_scene_by_turn(self, loop_id: str, turn_index: int) -> Scene | None:
        row = self._fetchone(
            "SELECT * FROM scenes WHERE loop_id = %s AND turn_index = %s",
            (loop_id, turn_index),
        )
        if row is None:
            return None
        return self._scene_from_row(row)

    def get_latest_scene(self, loop_id: str) -> Scene | None:
        row = self._fetchone(
            "SELECT * FROM scenes WHERE loop_id = %s ORDER BY turn_index DESC LIMIT 1",
            (loop_id,),
        )
        if row is None:
            return None
        return self._scene_from_row(row)

    def list_scenes(self, loop_id: str) -> list[Scene]:
        rows = self._fetchall(
            "SELECT * FROM scenes WHERE loop_id = %s ORDER BY turn_index ASC",
            (loop_id,),
        )
        return [self._scene_from_row(row) for row in rows]

    def save_player_memory(self, memory: PlayerMemory) -> None:
        self._execute(
            """
            INSERT INTO player_memories (
              memory_id, player_id, kind, content, weight, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (memory_id) DO UPDATE SET
              kind = EXCLUDED.kind,
              content = EXCLUDED.content,
              weight = EXCLUDED.weight,
              updated_at = EXCLUDED.updated_at
            """,
            (
                memory.memory_id,
                memory.player_id,
                memory.kind,
                Jsonb(memory.content),
                memory.weight,
                memory.created_at,
                memory.updated_at,
            ),
        )

    def delete_player_memories(self, player_id: str, memory_ids: list[str]) -> int:
        if not memory_ids:
            return 0
        try:
            conn = self._connect()
            cursor = conn.execute(
                "DELETE FROM player_memories WHERE player_id = %s AND memory_id = ANY(%s)",
                (player_id, list(memory_ids)),
            )
            deleted = int(cursor.rowcount or 0)
            if self._transaction_depth == 0:
                conn.commit()
            return deleted
        except psycopg.Error as exc:
            if self._connection is not None and not self._connection.closed:
                self._connection.rollback()
            raise StoreError(str(exc)) from exc

    def list_player_memories(self, player_id: str) -> list[PlayerMemory]:
        rows = self._fetchall(
            "SELECT * FROM player_memories WHERE player_id = %s ORDER BY created_at",
            (player_id,),
        )
        return [
            PlayerMemory(
                memory_id=row["memory_id"],
                player_id=row["player_id"],
                kind=row["kind"],
                content=row["content"],
                weight=row["weight"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]

    # --- Progression (player_progression 단일 row upsert) ---------------------
    _PROGRESSION_INT_COLS = (
        "runs_completed",
        "insight_points",
        "total_clues",
        "total_combats_won",
        "total_combats_lost",
    )
    _PROGRESSION_JSON_COLS = (
        "unlocked_skills",
        "learned_skills",
        "skill_ranks",
        "unlocked_archetypes",
        "unlocked_traits",
        "unlocked_allies",
        "unlocked_starting_items",
        "codex_unlocks",
        "epiphanies_seen",
        "endings_seen",
        "allies_met",
        "relationships",
        "unlocked_cutscenes",
    )
    _PROGRESSION_DICT_COLS = ("skill_ranks", "relationships")

    def get_progression(self, player_id: str, scenario_id: str) -> dict[str, Any] | None:
        row = self._fetchone(
            "SELECT * FROM player_progression WHERE player_id = %s AND scenario_id = %s",
            (player_id, scenario_id),
        )
        if row is None:
            return None
        content: dict[str, Any] = {"player_id": player_id, "scenario_id": scenario_id}
        for col in self._PROGRESSION_INT_COLS:
            content[col] = int(row.get(col) or 0)
        for col in self._PROGRESSION_JSON_COLS:
            content[col] = row.get(col)
        return content

    def save_progression(self, player_id: str, scenario_id: str, content: dict[str, Any]) -> None:
        int_vals = [int(content.get(col) or 0) for col in self._PROGRESSION_INT_COLS]
        json_vals = [
            Jsonb(content.get(col) or ({} if col in self._PROGRESSION_DICT_COLS else []))
            for col in self._PROGRESSION_JSON_COLS
        ]
        cols = (*self._PROGRESSION_INT_COLS, *self._PROGRESSION_JSON_COLS)
        set_clause = ", ".join(f"{col} = EXCLUDED.{col}" for col in cols)
        placeholders = ", ".join(["%s"] * (2 + len(cols)))
        self._execute(
            f"""
            INSERT INTO player_progression (player_id, scenario_id, {", ".join(cols)})
            VALUES ({placeholders})
            ON CONFLICT (player_id, scenario_id) DO UPDATE SET
              {set_clause}, updated_at = now()
            """,
            (player_id, scenario_id, *int_vals, *json_vals),
        )

    # --- Inventory (loop_inventory; loop 단위) --------------------------------
    def list_inventory(self, loop_id: str) -> list[dict[str, Any]]:
        rows = self._fetchall(
            "SELECT item_id, quantity, equipped FROM loop_inventory "
            "WHERE loop_id = %s ORDER BY acquired_at, item_id",
            (loop_id,),
        )
        return [
            {
                "item_id": r["item_id"],
                "quantity": int(r["quantity"]),
                "equipped": bool(r["equipped"]),
            }
            for r in rows
        ]

    def set_inventory(self, loop_id: str, items: list[dict[str, Any]]) -> None:
        with self.transaction():
            self._execute("DELETE FROM loop_inventory WHERE loop_id = %s", (loop_id,))
            for item in items:
                self._execute(
                    """
                    INSERT INTO loop_inventory (loop_id, item_id, quantity, equipped)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (loop_id, item_id) DO UPDATE SET
                      quantity = EXCLUDED.quantity, equipped = EXCLUDED.equipped
                    """,
                    (
                        loop_id,
                        str(item.get("item_id")),
                        int(item.get("quantity") or 1),
                        bool(item.get("equipped") or False),
                    ),
                )

    def save_world_memory(self, memory: WorldMemory) -> None:
        self._execute(
            """
            INSERT INTO world_memories (
              memory_id, world_id, kind, content, weight, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (memory_id) DO UPDATE SET
              kind = EXCLUDED.kind,
              content = EXCLUDED.content,
              weight = EXCLUDED.weight,
              updated_at = EXCLUDED.updated_at
            """,
            (
                memory.memory_id,
                memory.world_id,
                memory.kind,
                Jsonb(memory.content),
                memory.weight,
                memory.created_at,
                memory.updated_at,
            ),
        )

    def list_world_memories(self, world_id: str) -> list[WorldMemory]:
        rows = self._fetchall(
            "SELECT * FROM world_memories WHERE world_id = %s ORDER BY created_at",
            (world_id,),
        )
        return [
            WorldMemory(
                memory_id=row["memory_id"],
                world_id=row["world_id"],
                kind=row["kind"],
                content=row["content"],
                weight=row["weight"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]

    def save_narrative_shard(self, shard: NarrativeShard) -> None:
        self._execute(
            """
            INSERT INTO narrative_shards (
              shard_id, loop_id, player_id, symbol, emotional_tone, text, weight, created_at, kind, metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (shard_id) DO UPDATE SET
              symbol = EXCLUDED.symbol,
              emotional_tone = EXCLUDED.emotional_tone,
              text = EXCLUDED.text,
              weight = EXCLUDED.weight,
              kind = EXCLUDED.kind,
              metadata = EXCLUDED.metadata
            """,
            (
                shard.shard_id,
                shard.loop_id,
                shard.player_id,
                shard.symbol,
                shard.emotional_tone,
                shard.text,
                shard.weight,
                shard.created_at,
                shard.kind,
                Jsonb(shard.metadata),
            ),
        )

    def list_narrative_shards(self, player_id: str, limit: int = 8) -> list[NarrativeShard]:
        rows = self._fetchall(
            """
            SELECT * FROM narrative_shards
            WHERE player_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (player_id, limit),
        )
        return [
            NarrativeShard(
                shard_id=row["shard_id"],
                loop_id=row["loop_id"],
                player_id=row["player_id"],
                symbol=row["symbol"],
                emotional_tone=row["emotional_tone"],
                text=row["text"],
                weight=row["weight"],
                created_at=row["created_at"],
                kind=row.get("kind", "general"),
                metadata=row.get("metadata", {}),
            )
            for row in rows
        ]

    def save_asset(self, asset: AssetRecord) -> None:
        self._execute(
            """
            INSERT INTO assets (
              asset_id, scene_id, loop_id, provider, model_id, prompt, seed,
              width, height, steps, storage_uri, metadata, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (asset_id) DO UPDATE SET
              scene_id = EXCLUDED.scene_id,
              provider = EXCLUDED.provider,
              model_id = EXCLUDED.model_id,
              prompt = EXCLUDED.prompt,
              seed = EXCLUDED.seed,
              width = EXCLUDED.width,
              height = EXCLUDED.height,
              steps = EXCLUDED.steps,
              storage_uri = EXCLUDED.storage_uri,
              metadata = EXCLUDED.metadata
            """,
            (
                asset.asset_id,
                asset.scene_id,
                asset.loop_id,
                asset.provider,
                asset.model_id,
                asset.prompt,
                asset.seed,
                asset.width,
                asset.height,
                asset.steps,
                asset.storage_uri,
                Jsonb(asset.metadata),
                asset.created_at,
            ),
        )

    def list_assets(self, loop_id: str) -> list[AssetRecord]:
        rows = self._fetchall(
            "SELECT * FROM assets WHERE loop_id = %s ORDER BY created_at", (loop_id,)
        )
        return [
            AssetRecord(
                asset_id=row["asset_id"],
                scene_id=row["scene_id"],
                loop_id=row["loop_id"],
                provider=row["provider"],
                model_id=row["model_id"],
                prompt=row["prompt"],
                seed=row["seed"],
                width=row["width"],
                height=row["height"],
                steps=row["steps"],
                storage_uri=row["storage_uri"],
                metadata=row["metadata"],
                created_at=row["created_at"],
                status=row["metadata"].get("status", "succeeded"),
            )
            for row in rows
        ]

    @contextmanager
    def transaction(self) -> Iterator[None]:
        if self._transaction_depth == 0:
            # The transition unit deliberately never retries mid-flight (state
            # died with the socket), so verify the HELD connection before BEGIN:
            # a store that lives across an idle gap (the WS session service) can
            # be holding a connection Neon already reaped. _fetchone routes
            # through _run_query, whose reset+retry (with the pool's checkout
            # check) lands us on a live connection before any work starts.
            self._fetchone("SELECT 1", ())
        conn = self._connect()
        try:
            self._transaction_depth += 1
            with conn.transaction():
                yield
        except psycopg.Error as exc:
            raise StoreError(str(exc)) from exc
        finally:
            self._transaction_depth -= 1

    def _connect(self) -> psycopg.Connection[dict[str, Any]]:
        if self._connection is None or self._connection.closed:
            if PostgresMythOSStore._pool is not None:
                self._connection = PostgresMythOSStore._pool.getconn()
            else:
                self._connection = psycopg.connect(str(self.database_url), row_factory=dict_row)
        assert self._connection is not None
        return self._connection

    @staticmethod
    def _is_connection_dropped(exc: psycopg.Error) -> bool:
        """True for server-side connection terminations worth one reconnect.

        Neon (serverless Postgres) reaps idle connections with an
        ``AdminShutdown`` ("terminating connection due to administrator
        command"); the app then reuses the pool's dead connection and 500s
        (live 2026-07-05, ``/auth/connect``). Class 57 = operator intervention;
        Operational/InterfaceError cover client-visible socket deaths.
        """
        if isinstance(exc, psycopg.OperationalError | psycopg.InterfaceError):
            return True
        sqlstate = getattr(exc, "sqlstate", None)
        return bool(sqlstate and str(sqlstate).startswith("57"))

    def _reset_connection(self) -> None:
        """Discard the (dead) connection so ``_connect`` builds a fresh one."""
        conn = self._connection
        self._connection = None
        if conn is None:
            return
        try:
            if PostgresMythOSStore._pool is not None:
                PostgresMythOSStore._pool.putconn(conn)
            else:
                conn.close()
        except Exception:
            pass

    def _run_query(self, op: Any) -> Any:
        """Run a query closure with one reconnect-retry on a dropped connection.

        Retry only OUTSIDE an open transaction: mid-transaction work already
        lost its state with the connection, so replaying a single statement
        would be silently partial — the caller must fail and retry the unit.
        """
        try:
            return op()
        except psycopg.Error as exc:
            dropped = self._is_connection_dropped(exc)
            if self._connection is not None and not self._connection.closed:
                try:
                    self._connection.rollback()
                except psycopg.Error:
                    pass
            if not dropped or self._transaction_depth > 0:
                raise StoreError(str(exc)) from exc
            self._reset_connection()
            try:
                return op()
            except psycopg.Error as retry_exc:
                if self._connection is not None and not self._connection.closed:
                    try:
                        self._connection.rollback()
                    except psycopg.Error:
                        pass
                raise StoreError(str(retry_exc)) from retry_exc

    def _execute(self, sql: str, params: tuple[Any, ...]) -> None:
        def _op() -> None:
            conn = self._connect()
            conn.execute(sql, params)
            if self._transaction_depth == 0:
                conn.commit()

        self._run_query(_op)

    def _fetchone(self, sql: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
        def _op() -> dict[str, Any] | None:
            conn = self._connect()
            with conn.execute(sql, params) as cursor:
                row = cursor.fetchone()
            if self._transaction_depth == 0:
                conn.commit()
            return row

        return cast("dict[str, Any] | None", self._run_query(_op))

    def _fetchall(self, sql: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
        def _op() -> list[dict[str, Any]]:
            conn = self._connect()
            with conn.execute(sql, params) as cursor:
                rows = list(cursor.fetchall())
            if self._transaction_depth == 0:
                conn.commit()
            return rows

        return cast("list[dict[str, Any]]", self._run_query(_op))

    @staticmethod
    def _loop_from_row(row: dict[str, Any]) -> LoopState:
        state = dict(row["state"] or {})
        active_echoes = [from_json_dict(Echo, item) for item in state.pop("_active_echoes", [])]
        return LoopState(
            loop_id=row["loop_id"],
            player_id=row["player_id"],
            seed=row["seed"],
            phase=LoopPhase(row["phase"]),
            location_id=row["location_id"],
            stability=row["stability"],
            tension=row["tension"],
            started_at=row["started_at"],
            ended_at=row["ended_at"],
            state=state,
            active_echoes=active_echoes,
        )

    @staticmethod
    def _scene_from_row(row: dict[str, Any]) -> Scene:
        return Scene(
            scene_id=row["scene_id"],
            loop_id=row["loop_id"],
            turn_index=row["turn_index"],
            title=row["title"],
            location=row["location"],
            narration=row["narration"],
            choices=[from_json_dict(Choice, item) for item in row["choices"]],
            visual_brief=row["visual_brief"],
            created_at=row["created_at"],
            objective=row.get("objective"),
            action_result=row.get("action_result"),
            scene_type=row.get("scene_type", "static"),
        )
