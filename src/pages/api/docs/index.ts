import type { APIRoute } from "astro";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const prerender = false;

/**
 * Serves the OpenAPI documentation
 */
export const GET: APIRoute = async () => {
  try {
    // Get the directory path of the current module
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDirPath = path.dirname(currentFilePath);

    // Path to the OpenAPI YAML file
    const yamlFilePath = path.join(currentDirPath, "openapi.yaml");

    // Read the file
    const yamlContent = fs.readFileSync(yamlFilePath, "utf-8");

    // Return the YAML content
    return new Response(yamlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/yaml",
      },
    });
  } catch (error) {
    console.error("Error serving OpenAPI documentation:", error);

    return new Response(JSON.stringify({ error: "Failed to load API documentation" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
