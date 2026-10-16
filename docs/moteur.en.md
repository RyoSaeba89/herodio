# The Herodio story engine

*[Version française](moteur.md)*

A story is created once and must play **in exactly the same way** on every device. To achieve this, each player carries its own copy of the engine. All these copies follow the same rules, which are described here and checked by shared tests.

| Implementation | File | Used by |
|---|---|---|
| TypeScript (reference) | `editor/src/engine/engine.ts` | the editor's preview |
| Rust | `players/desktop/src/engine.rs` | Windows, Linux and Raspberry Pi players |
| Java (API 9 compatible) | `players/android/common/org/herodio/core/Engine.java` | Android 2.3 → 14 player |

## Game state

- `node`: the block shown to the player (a scene, a choice or an ending), or nothing.
- `status`: `playing`, `end` or `error`.
- `items`: an ordered list, without duplicates, of the items owned.
- `vars`: one 32-bit integer per counter, initialised with its `initial` value.
- `visited`: the set of blocks already passed through, including logic blocks.

## Rules

`start()` resets the state (empty bag, counters at their initial value, `visited` emptied), then **enters** the `start` block.

**Entering** a block `id` means repeating the following steps, at most `1000` times:

1. If `id` is null or unknown, the story stops (`status = end`, `node = null`, token `#end`).
2. Add `id` to `visited`.
3. Depending on the block type:
   - **`scene`** or **`choice`**: it becomes the block shown, `status = playing`. Stop.
   - **`end`**: it becomes the block shown, `status = end`. Stop.
   - **`item`**: `give` adds the item if it is not already in the bag; `take` removes it. Continue to `next`.
   - **`var`**: `set` gives the counter the value `value`; `add` adds `value` to it, wrapping around on 32 bits. An unknown counter is 0. Continue to `next`.
   - **`cond`**: continue to `then` if the test is true, otherwise to `else`.
     - `item`: is the item in the bag?
     - `var`: is the comparison `counter op value` true? (`==`, `!=`, `<`, `<=`, `>`, `>=`)
     - `visited`: is the block in `visited`?
   - **`jump`**: if `reset` is true, reset the bag, the counters and `visited`. Continue to `target`.
   - **Unknown type**: error.
4. After 1000 steps without reaching a scene, a choice or an ending, it is an **endless loop**: `status = error`, token `#error`.

The player can only do the following:

- `next()`: on a scene, enter `next`. No effect elsewhere.
- `choose(i)`: on a choice, enter the target of answer `i`. No effect if `i` is out of range.
- `start()`: start again.

The players move on from a scene automatically when its sound ends. A scene without a sound waits for the player to press "Next".

## Conformance tests

Each `spec/conformance/*.json` file contains:

- a story;
- a sequence of inputs (`next`, `choose:N`, `restart`);
- the expected **trace**, that is the token of the block shown after starting and after each input (block identifier, `#end` or `#error`);
- the expected final state (items and counters).

| Engine | Command |
|---|---|
| TypeScript | `cd editor && npm test` |
| Rust | `cd players/desktop && cargo test` |
| Java | `cd players/android && python build.py` (also runs the tests) |

To add a rule to the engine: first write a conformance file, then change the three engines until they all pass it.
