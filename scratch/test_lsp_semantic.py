import json
import sys

# Ensure we can import serena if installed globally or via uv
try:
    from serena.agent import SerenaAgent
    from serena.config.serena_config import SerenaConfig
    from serena.tools.symbol_tools import FindSymbolTool
except ImportError:
    print("Serena package not in path. Try running with uv.")
    sys.exit(1)


def test_lsp():
    project_root = "/Users/men1692/Desktop/local/MythOS"
    # 1. Instantiate default configuration
    config = SerenaConfig()

    # 2. Create Serena Agent with project root path string
    agent = SerenaAgent(project=project_root, serena_config=config)

    # 4. Initialize LSP managers
    print("--> Initializing language servers (Pyright)...")
    agent.get_language_server_manager_or_raise()

    # 5. Execute FindSymbolTool
    print("--> Querying symbol: RuntimeSessionService")
    tool = FindSymbolTool(agent)
    result_str = tool.apply(name_path_pattern="RuntimeSessionService", include_info=True)

    print("\n=== LSP SEARCH RESULT ===")
    try:
        parsed = json.loads(result_str)
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
    except Exception:
        print(result_str)
    print("=========================\n")

    # 6. Teardown
    print("--> Shutting down language servers...")
    agent.reset_language_server_manager()


if __name__ == "__main__":
    test_lsp()
