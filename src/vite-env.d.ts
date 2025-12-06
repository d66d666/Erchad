/// <reference types="vite/client" />

interface Window {
  electron?: {
    shell: {
      openExternal: (url: string) => Promise<void>
    }
  }
}
