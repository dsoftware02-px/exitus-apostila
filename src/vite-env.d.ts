/// <reference types="vite/client" />

declare module '*.css?raw' {
  const content: string;
  export default content;
}

declare module 'pagedjs' {
  export class Previewer {
    preview(
      content: string,
      stylesheets: Array<{ text: string }>,
      renderTo: HTMLElement
    ): Promise<void>;
  }
}
