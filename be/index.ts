import { $ } from "bun";

for await (let line of $`bun run example.ts`.lines()) {
    console.log(line);
}
