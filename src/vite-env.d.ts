/// <reference types="vite/client" />

// CSS module imports with ?inline query
declare module "*.css?inline" {
  const content: string;
  export default content;
}
