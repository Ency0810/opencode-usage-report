declare module "@opencode/plugin" {
  export const Plugin: any
}

declare module "@opencode/plugin/tui" {
  export const Plugin: any
}

declare module "@opentui/core" {
  export const TextRenderable: any
  export const BoxRenderable: any
}

declare namespace JSX {
  interface IntrinsicElements {
    [name: string]: any
  }
}
