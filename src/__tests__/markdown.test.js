import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "../components/ai/Markdown";

const RISPOSTA = `### Bowl vegana “Equilibrata” (≈ 420 kcal)

| Ingrediente | Quantità | Calorie |
|-------------|----------|---------|
| **Base** – quinoa integrale cotta | 80 g (peso crudo) | 110 kcal |
| **Proteine** – tofu pressato | 100 g | 120 kcal |

**Totale:** **≈ 420 kcal**

#### Come assemblarla (5‑10 min)

1. **Cuoci la quinoa** (12 min).
2. **Griglia il tofu**: 3‑4 min per lato.

- spinaci
- pomodorini

Buon appetito!`;

test("la risposta dell'AI diventa titoli, tabella, elenchi e grassetti (niente markdown grezzo)", () => {
  const html = renderToStaticMarkup(<Markdown testo={RISPOSTA} />);
  expect(html).toContain('class="md-h md-h3"');
  expect(html).toContain("<table>");
  expect(html.match(/<tr>/g).length).toBe(3); // intestazione + 2 righe
  expect(html).toContain("<strong>Base</strong>");
  expect(html).toContain("<ol");
  expect(html).toContain("<ul");
  expect(html).not.toMatch(/###|\*\*|\|---/);
});

test("l'HTML nel testo dell'AI non viene eseguito", () => {
  const html = renderToStaticMarkup(<Markdown testo={'<img src=x onerror="alert(1)"> ciao'} />);
  expect(html).not.toContain("<img");
  expect(html).toContain("&lt;img");
});
