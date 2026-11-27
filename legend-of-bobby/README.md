# The Legend of Bobby

The approved title logo and character are stored here. The world, story, and mechanics below are proposals for discussion.

| Asset | Use |
| --- | --- |
| [Title logo](assets/title-logo.png) | Transparent PNG with the gold star, blue shield, and sword |
| [Bobby](assets/bobby.glb) | Static 3D character with the closed face and hair mesh |
| [Editable Bobby](assets/bobby.bbmodel) | Blockbench model with an embedded material palette |

## World and art

Build a compact, interconnected world at Bobby’s scale. One hub has people worth revisiting and paths into distinct regions. From the hub, players can see a landmark in each direction and choose what to investigate. Loops and shortcuts make the same places feel different when Bobby returns with a new tool. Use separately loaded interiors and regions connected by short paths, with transitions at doors, tunnels, or terrain bends. Start by loading the current area and preloading its immediate exits.

A possible setting is a small lakeside town near an old hillside signal station. The water tower, spillway, and signal tower give players a sense of direction. A local character can mention a route without adding a map marker. As Bobby repairs things, the town reacts and the routes change. This setting and the sample items are provisional.

Match Bobby’s faceted silhouette, muted colors, and simple forms. Give trees, roofs, rocks, and furniture enough silhouette to read at a distance. Use small hand-painted textures, broad lighting, a limited palette per region, and distance fog to separate layers. Keep UI text at screen resolution even if the 3D scene renders at a lower resolution. Reserve higher geometry and texture detail for faces, hands, and objects Bobby actually uses.

## Movement and interaction

- Move relative to a third-person camera. Start with walking, running, turning, and stepping over small curbs. Give the camera a gentle follow, a recenter action, and a collision check that pulls it in near walls. Let players adjust sensitivity and invert vertical movement.
- Give Bobby one contextual action for Talk, Open, Pick Up, or Inspect. Select the eligible target in range that is nearest the center of view and visible from Bobby. Show one prompt and hold the target steady as the player approaches.
- Give equipped items their own action. A single press applies the active item at the shown target. Preview a meaningful verb such as **Turn Winch**. If it fails, explain what Bobby notices and preserve the item.
- On desktop, test WASD, mouse camera, E to interact, and a dedicated item key. On landscape mobile, test left joystick, drag on the scene to look, A to interact, and B for the equipped item. A recenter button provides a recovery when the camera points the wrong way. Keep familiar Arcade navigation and safe-area spacing. The 3D camera and input behaviors belong to this project.

Bobby’s current GLB needs a skeleton and idle, walk, run, and interaction clips. Keep collision geometry separate from visual meshes. Treat combat and targeting as later decisions after traversal, camera, and puzzles feel good.

## Items, NPCs, and progression

Give each item and world object a stable ID. Each interaction has a target, requirements, effects, and a response when requirements are missing. Separate inventory, quest progress, and persistent world state so collecting a tool and changing the world are independently recorded. Apply inventory and world changes together after a successful interaction. On repeat interactions or reload, solved objects should report their current state and one-time rewards should stay claimed.

| Encounter | Requirement | Persistent result |
| --- | --- | --- |
| Inspect the old winch | None | Bobby learns it is missing a crank |
| Talk to the caretaker | None | The caretaker points Bobby toward the boathouse |
| Pick up the crank | Find it in the boathouse | Add a reusable crank to inventory |
| Turn the spillway winch | Crank equipped | Lower the water and expose a footpath |
| Turn the signal tower lift | Same crank equipped | Open a later route and a shortcut back to town |
| Talk to the caretaker again | Spillway lowered | Dialogue reflects what Bobby did |

The crank works even if found before meeting the caretaker. Inspecting the winch never consumes it. Keep required tools reusable and out of sell or discard flows. Let quests guide discovery and make physical tools and world changes determine access. If an area has multiple prerequisites, expose them individually through what Bobby sees or hears. Keep a short journal of discovered clues. Make long-form saves an explicit decision for this game, with a proposed local save and a visible New Game action.

## Open-source references and engine choice

| Option | What to borrow | Tradeoff |
| --- | --- | --- |
| [Three.js glTF loader](https://threejs.org/docs/pages/GLTFLoader.html) and [Rapier character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/) | Load Bobby and future animation clips in the browser. Use capsule movement, slope handling, autostep, and ground snapping. | Fits a static browser Arcade. Camera collision, loading, world state, and scene authoring need our own implementation. |
| [Godot](https://github.com/godotengine/godot) and [third-person demo](https://github.com/godotengine/tps-demo) | Study the camera and character architecture. Use the editor to lay out collision, triggers, and scenes. | The [web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) uses the Compatibility renderer and WebGL 2. Test Safari and phone performance before choosing it. |

Start with Three.js and Rapier if playing through the existing Arcade link remains the priority. Pick Godot if hands-on scene editing becomes more important. Use the open-source references for engineering patterns and author original artwork and levels.

## First playable test, once approved

Build one short loop through the town square, boathouse, and spillway. Bobby can explore, talk to the caretaker, find the crank, fit it to the winch, and take the newly exposed path back to town. Include one optional discovery off the critical path. Test the same loop with the clue first and the item first.

Use this slice to see whether the camera keeps Bobby visible in tight spaces, prompts choose the intended target, the landmark guides players without instructions, and touch movement stays comfortable in landscape. If saves are added, test reloading before and after the water lowers. Profile the slice on a real phone before setting scene-size and texture budgets or committing to a larger map.
