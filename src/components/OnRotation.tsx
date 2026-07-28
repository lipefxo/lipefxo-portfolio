import { site } from "@/config/site";
import { ListeningConsole } from "./ListeningConsole";
import { Reveal } from "./Reveal";

export function OnRotation() {
  return (
    <section id="on-rotation" aria-label="On rotation" className="scroll-mt-20">
      <Reveal>
        <ListeningConsole albums={site.onRotation} />
      </Reveal>
    </section>
  );
}
