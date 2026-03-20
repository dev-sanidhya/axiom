import re
from pathlib import Path


def _analyze_file(path: Path):
    content = path.read_text(encoding="utf-8", errors="ignore")
    exports = re.findall(r"export\s+(?:const|function|class|type|interface)\s+([A-Za-z0-9_]+)", content)
    classes = re.findall(r"class\s+([A-Za-z0-9_]+)", content)
    functions = re.findall(r"(?:function\s+([A-Za-z0-9_]+)|def\s+([A-Za-z0-9_]+))", content)
    headings = re.findall(r"^#+\s+(.+)$", content, re.MULTILINE)

    flattened_functions = [name for group in functions for name in group if name]

    return {
        "path": str(path),
        "exports": exports[:8],
        "classes": classes[:8],
        "functions": flattened_functions[:8],
        "headings": headings[:8],
    }


def document(target: str) -> str:
    path = Path(target)
    insights = []

    if path.exists() and path.is_file():
        insights.append(_analyze_file(path))
    elif path.exists() and path.is_dir():
        patterns = {".ts", ".tsx", ".js", ".jsx", ".py", ".md", ".json"}
        for file_path in list(path.rglob("*"))[:50]:
            if file_path.is_file() and file_path.suffix in patterns:
                insights.append(_analyze_file(file_path))
                if len(insights) >= 6:
                    break

    if not insights:
        return "\n".join([
            "# Documentation Outline",
            "",
            "## Goal",
            "",
            target,
            "",
            "## Recommended Sections",
            "",
            "- Overview",
            "- Key workflows",
            "- Configuration",
            "- Examples",
            "- Troubleshooting",
        ])

    output = [
        "# Documentation Summary",
        "",
        "## Overview",
        "",
        f"Reviewed {len(insights)} file(s) to generate a documentation baseline.",
        "",
        "## Notable Files",
        "",
    ]

    for insight in insights:
        output.append(f"### {insight['path']}")
        output.append("")
        if insight["exports"]:
            output.append(f"- **Exports**: {', '.join(insight['exports'])}")
        if insight["classes"]:
            output.append(f"- **Classes**: {', '.join(insight['classes'])}")
        if insight["functions"]:
            output.append(f"- **Functions**: {', '.join(insight['functions'])}")
        if insight["headings"]:
            output.append(f"- **Headings**: {', '.join(insight['headings'])}")
        output.append("")

    output.extend([
        "## Suggested README Structure",
        "",
        "- Overview",
        "- Primary entry points and APIs",
        "- Setup or configuration prerequisites",
        "- Usage examples",
        "- Troubleshooting",
    ])

    return "\n".join(output)
