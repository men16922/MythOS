# tools/quarkify — 코드 토폴로지 인덱스

[Quarkify](https://github.com/companyjupiter/quarkify)(Apache-2.0, 외부 도구)로 `src/**/*.py`를
폴더 토폴로지(`quark/`·`_mirror/`·`_axon/`)로 분해해 `.quarkify/src/`에 떨군다. 에이전트가 grep 루프
없이 *어느 파일·어느 함수·어디서 호출*을 결정론적으로 탐색하는 **선택적 가속기**다.

## 사용

```bash
make quarkify-setup   # 최초 1회: 고정 커밋으로 도구 clone (~/tools/quarkify, 의존성 0)
make quarkify         # src 전체 재생성 → .quarkify/src/ (~4s, gitignored)
```

## 쿼리 예시

```bash
find .quarkify/src/quark -type d -iname '*store*'      # 'store' 심볼이 든 위치(패키지 횡단)
ls   .quarkify/src/_mirror/by_role/persistence         # 역할별 평면 조회
ls   .quarkify/src/_mirror/by_file/                     # 파일별 쿼크
cat  .quarkify/src/ai_context_guide.txt                # 도구가 쓴 에이전트 지침
```

폴더명이 `file__src_mythos_<pkg>_<module>_…/class__X/fn__y/stmt_…`로 전 경로를 인코딩 → 단일 트리지만
패키지는 `file__src_mythos_<pkg>_` 접두로 자연 분리된다.

## 파일

- `setup.sh` — 고정 SHA로 도구 조달(멱등, npm 불필요).
- `config.mjs` — whole-src 설정(대상 glob·출력 경로·`guessRole` 역할 태깅).
- `generate.sh` — 재생성 드라이버(`make quarkify`가 호출).

## 주의 / 한계

- `.quarkify/`는 **커밋 안 함**(빈 폴더 다수, 로컬 빌드물). 풀/코드변경 후 `make quarkify` 재실행.
- **권위는 원본 소스.** quark 리프는 빈 폴더(심볼 위치만) — 본문은 원본 파일을 읽는다.
- 히트 적은 드문-심볼 검색은 grep이 더 쌈. 사용 가이드: 루트 `CLAUDE.md` "## Quarkify".
- PoC 평가/근거: `docs/plans/2026-06-18-quarkify-poc.md`. PoC 당시 패키지별 설정은
  `tools/quarkify-poc/`에 증거로 동결(이 production 경로가 이를 대체).
