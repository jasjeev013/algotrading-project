import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import App from "../App";

// TODO: this project is plain JS/JSX today. A future task will migrate the
// frontend to TypeScript; at that point add a `typecheck` script (tsc --noEmit)
// and a corresponding CI job. Skipped intentionally for now.

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });
});
