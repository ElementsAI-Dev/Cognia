"""Capability contract helpers for the Python SDK."""

from typing import Dict, Iterable, List, Tuple

CAPABILITY_SUPPORT: Dict[str, str] = {
    "tools": "supported",
    "components": "supported",
    "modes": "supported",
    "skills": "blocked",
    "themes": "partial",
    "commands": "supported",
    "hooks": "supported",
    "processors": "experimental",
    "providers": "experimental",
    "exporters": "partial",
    "importers": "partial",
    "a2ui": "supported",
    "python": "supported",
    "scheduler": "supported",
}


def validate_capability_contract(capabilities: Iterable[str]) -> Tuple[List[str], List[str]]:
    errors: List[str] = []
    warnings: List[str] = []

    for capability in capabilities:
        support = CAPABILITY_SUPPORT.get(capability)
        if support is None:
            errors.append(f'Capability "{capability}" is unknown to the SDK capability matrix.')
            continue
        if support == "blocked":
            errors.append(f'Capability "{capability}" is blocked by the current host capability matrix.')
            continue
        if support != "supported":
            warnings.append(
                f'Capability "{capability}" is only {support}ly supported by the current host capability matrix.'
            )

    return errors, warnings
