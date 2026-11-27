# Arcade game architecture decisions

Use this at the start of a game or before replacing a major system.

1. Write down the player action, the target devices, and the smallest playable loop that tests it.
2. Check [shared player code](../../shared/player/) and [the architecture index](../../ARCHITECTURE.md). If a current module fits, reuse its public interface.
3. Check the chosen engine. Prefer its built-in capabilities where they meet the playtest requirements.
4. For an external dependency, record the exact version, source, code license, asset license, attribution, and a runnable example. Verify that Codex can edit, debug, build, and test it in the target environment. Compare adaptation cost with a small implementation.
5. Mark each decision **Reuse**, **Adopt**, **Adapt**, **Build**, or **Defer**. Record where the code lives and one test that can prove the decision works.
6. Extract to shared code once two distinct consumers can use it with different tuning and assets. Document the interface and test both consumers. Keep asset conventions and evaluation criteria here even when the runtime implementations differ.

| System | Check first | Keep with the game |
| --- | --- | --- |
| Browser chrome and controls | Shared navigation, layout, controller actions, safe areas | Action bindings, prompts, device-specific mechanics |
| Character and camera | Engine movement, collision, camera, and animation APIs | Rig, model, camera tuning, timing, and choreography |
| Interactions and combat | Engine collision and animation events, licensed examples | Target rules, swing windows, reactions, and progression |
| Dialogue, cutscenes, audio | Portable UTF-8 text, engine animation and audio, browser gesture requirements | Lines, voice and sound design, shot selection, story state |
| Builds, persistence, QA | Static host, same-origin asset paths, versioned build IDs | Save rules, target browser checks, gameplay acceptance |

Before changing shared browser code, capture Desperados start, reload, and return navigation. After a change, rerun those checks and test a second consumer. A new isolated game can use existing shared code without a migration. Keep stable game URLs and expose build IDs in playtests.

Bobby uses Godot's character physics and camera collision in its own project. The Arcade navigation remains a browser module. Movement, camera, targeting, melee and dialogue runtime stay in Bobby until a second 3D game demonstrates that they can be shared. The first acceptance test is one coastal encounter with movement, camera clipping, Rina follow, editable dialogue, miss/hit, and restart.
