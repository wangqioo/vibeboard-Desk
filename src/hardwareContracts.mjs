export function injectHardwareAppContracts(source, buildId) {
  const text = String(source || "");
  const idJson = JSON.stringify(buildId);

  if (text.includes('"runtime"') && text.includes('"executed_on_board"') && text.includes('"build_id"')) {
    return text;
  }

  const sourceJson = JSON.stringify(text);
  return `
# --- Golden-loop contract injection (auto-injected) ---
import json as __json
import sys as __sys

__original_print = print
__build_id = ${idJson}
__script_content = ${sourceJson}

def __wrapped_main():
    """Run original script and inject required fields."""
    import io
    import socket

    __old_stdout = __sys.stdout
    __sys.stdout = __buffer = io.StringIO()
    try:
        exec(__script_content, {"__name__": "__main__"})
    finally:
        __sys.stdout = __old_stdout

    __raw_output = __buffer.getvalue().strip()
    try:
        __result = __json.loads(__raw_output)
    except __json.JSONDecodeError:
        __result = {"raw_output": __raw_output}

    __result["build_id"] = __build_id
    __result["runtime"] = "executed_on_board"
    __result["hostname"] = __result.get("hostname", socket.gethostname())

    __original_print(__json.dumps(__result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    __wrapped_main()
`;
}
