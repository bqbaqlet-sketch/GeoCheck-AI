// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Findings, Source, Stats } from "./ui";
import { Well } from "../api";
afterEach(cleanup);
const well: Well = {
  id: "w",
  name: "W",
  filename: "w.csv",
  source: "synthetic",
  created: "",
  format: "CSV",
  start: 0,
  end: 1,
  depth_unit: "m",
  rows: 2,
  units: { GR: "API" },
};
it("labels synthetic and uploaded sources", () => {
  const { rerender } = render(<Source well={well} />);
  expect(screen.getByText("Синтетика")).toBeTruthy();
  rerender(<Source well={{ ...well, source: "upload" }} />);
  expect(screen.getByText("Файл пользователя")).toBeTruthy();
});
it("shows computed counts in an empty workspace", () => {
  render(<Stats runs={[]} wells={[]} />);
  expect(screen.getAllByText("0")).toHaveLength(4);
});
it("displays warning evidence and its original depth unit", () => {
  render(
    <Findings
      unit="ft"
      items={[
        {
          method: "missing",
          curve: "GR",
          start: 10,
          end: 11,
          samples: 2,
          reason: "Нет измерения",
          score: null,
        },
      ]}
    />,
  );
  expect(screen.getByText("Интервал · ft")).toBeTruthy();
  expect(screen.getByText("Нет измерения")).toBeTruthy();
});
