declare module "plotly.js-cartesian-dist-min" {
  const plot: {
    react: (
      el: HTMLElement,
      traces: object[],
      layout: object,
      config: object,
    ) => Promise<void>;
    purge: (el: HTMLElement) => void;
    Plots: { resize: (el: HTMLElement) => Promise<void> };
  };
  export default plot;
}
