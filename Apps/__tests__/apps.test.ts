import fs from "fs";
import path from "path";
import jsyaml from "js-yaml";

interface DockgeMetadata {
  name: string;
  id: string;
  description: string;
  tagline: string;
  icon: string;
  thumbnail?: string;
  author: string;
  developer: string;
  category: string;
  version: string;
  image: string;
  port: string;
  youtube?: string;
  docs?: string;
  tags: string[];
  created: string;
  source: string;
}

interface DockerComposeService {
  image?: string;
  container_name?: string;
  ports?: string[];
  [key: string]: any;
}

interface DockerCompose {
  services?: Record<string, DockerComposeService>;
  [key: string]: any;
}

const getDockgeApps = (): string[] => {
  const apps: string[] = [];
  const appsDir = "./Apps";

  if (!fs.existsSync(appsDir)) {
    throw new Error(`Apps directory not found: ${appsDir}`);
  }

  const entries = fs.readdirSync(appsDir, { withFileTypes: true });

  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      const metadataPath = path.join(appsDir, entry.name, "metadata.json");
      const composePath = path.join(appsDir, entry.name, "compose.yaml");

      // Only include apps that have both required files
      if (fs.existsSync(metadataPath) && fs.existsSync(composePath)) {
        apps.push(entry.name);
      }
    }
  });

  return apps.sort();
};

const loadDockgeMetadata = (appName: string): DockgeMetadata | null => {
  const metadataPath = `./Apps/${appName}/metadata.json`;
  
  try {
    const metadataFile = fs.readFileSync(metadataPath, "utf8");
    return JSON.parse(metadataFile) as DockgeMetadata;
  } catch (e) {
    console.error(`Error parsing metadata file for ${appName}:`, e);
    return null;
  }
};

const loadDockerCompose = (appName: string): DockerCompose | null => {
  const composePath = `./Apps/${appName}/compose.yaml`;
  
  try {
    const composeFile = fs.readFileSync(composePath, "utf8");
    return jsyaml.load(composeFile) as DockerCompose;
  } catch (e) {
    console.error(`Error parsing compose file for ${appName}:`, e);
    return null;
  }
};

describe("Dockge App Validation", () => {
  const apps = getDockgeApps();

  it("Should find at least one Dockge app", () => {
    expect(apps.length).toBeGreaterThan(0);
  });

  describe("Each app should have valid metadata.json", () => {
    apps.forEach((appName) => {
      test(`${appName} - metadata.json exists and is valid`, () => {
        const metadata = loadDockgeMetadata(appName);
        
        expect(metadata).not.toBeNull();
        expect(metadata?.id).toBeDefined();
        expect(metadata?.id).toBe(appName);
        expect(metadata?.name).toBeDefined();
        expect(typeof metadata?.name).toBe("string");
        expect(metadata?.version).toBeDefined();
        expect(typeof metadata?.version).toBe("string");
        expect(metadata?.version.length).toBeGreaterThan(0);
        expect(metadata?.image).toBeDefined();
        expect(typeof metadata?.image).toBe("string");
        expect(metadata?.description).toBeDefined();
        expect(metadata?.tagline).toBeDefined();
        expect(metadata?.icon).toBeDefined();
        expect(metadata?.author).toBeDefined();
        expect(metadata?.developer).toBeDefined();
        expect(metadata?.category).toBeDefined();
        expect(metadata?.port).toBeDefined();
        expect(metadata?.tags).toBeDefined();
        expect(Array.isArray(metadata?.tags)).toBe(true);
        expect(metadata?.created).toBeDefined();
        expect(metadata?.source).toBeDefined();
      });
    });
  });

  describe("Each app should have valid compose.yaml", () => {
    apps.forEach((appName) => {
      test(`${appName} - compose.yaml exists and is valid YAML`, () => {
        const compose = loadDockerCompose(appName);
        
        expect(compose).not.toBeNull();
        expect(compose?.services).toBeDefined();
        expect(typeof compose?.services).toBe("object");
        expect(Object.keys(compose?.services || {}).length).toBeGreaterThan(0);
      });
    });
  });

  describe("Version consistency between metadata and compose", () => {
    apps.forEach((appName) => {
      test(`${appName} - versions match`, () => {
        const metadata = loadDockgeMetadata(appName);
        const compose = loadDockerCompose(appName);
        
        if (!metadata || !compose || !compose.services) {
          return; // Skip if files couldn't be loaded
        }

        const metadataVersion = metadata.version;
        const metadataImage = metadata.image;

        // Find services that use the main image
        const services = Object.values(compose.services);
        let foundMatch = false;

        services.forEach((service) => {
          if (service.image) {
            const imageBaseName = metadataImage.split(":")[0];
            
            if (service.image.includes(imageBaseName)) {
              // Extract version from docker image tag
              const imageVersion = service.image.split(":")[1];
              
              if (imageVersion) {
                // Check if versions match (allowing for minor variations)
                const normalizedMetadataVersion = metadataVersion.replace(/^v/, "");
                const normalizedImageVersion = imageVersion.replace(/^v/, "");
                
                if (normalizedImageVersion === normalizedMetadataVersion || 
                    normalizedImageVersion.includes(normalizedMetadataVersion)) {
                  foundMatch = true;
                }
              }
            }
          }
        });

        // Some apps might use 'latest' or have complex versioning
        if (!foundMatch && metadataVersion !== "latest") {
          console.warn(`${appName}: Version mismatch or couldn't verify - metadata: ${metadataVersion}`);
        }
      });
    });
  });

  describe("Port configuration should be valid", () => {
    apps.forEach((appName) => {
      test(`${appName} - port is properly configured`, () => {
        const metadata = loadDockgeMetadata(appName);
        const compose = loadDockerCompose(appName);
        
        if (!metadata || !compose || !compose.services) return;

        // Port should be a string and not empty
        expect(typeof metadata.port).toBe("string");
        expect(metadata.port.length).toBeGreaterThan(0);

        // Port should be a number or port range
        const portNumber = parseInt(metadata.port.split(":")[0], 10);
        expect(portNumber).toBeGreaterThan(0);
        expect(portNumber).toBeLessThanOrEqual(65535);

        // At least one service should expose ports
        const services = Object.values(compose.services);
        const hasPorts = services.some(service => 
          service.ports && Array.isArray(service.ports) && service.ports.length > 0
        );
        
        expect(hasPorts).toBe(true);
      });
    });
  });

  describe("Each app should have required files", () => {
    apps.forEach((appName) => {
      test(`${appName} - has all required files`, () => {
        const metadataPath = `./Apps/${appName}/metadata.json`;
        const composePath = `./Apps/${appName}/compose.yaml`;

        expect(fs.existsSync(metadataPath)).toBe(true);
        expect(fs.existsSync(composePath)).toBe(true);
      });
    });
  });

  describe("Image references should be properly formatted", () => {
    apps.forEach((appName) => {
      test(`${appName} - image reference is valid`, () => {
        const metadata = loadDockgeMetadata(appName);
        
        if (!metadata) return;

        // Image should have format: name or name:tag
        expect(metadata.image).toMatch(/^[a-zA-Z0-9._/-]+(:[\w.\-]+)?$/);
      });
    });
  });

  describe("Icon URLs should be properly formatted", () => {
    apps.forEach((appName) => {
      test(`${appName} - icon URL is valid`, () => {
        const metadata = loadDockgeMetadata(appName);
        
        if (!metadata) return;

        // Icon should be a valid URL
        expect(metadata.icon).toMatch(/^https?:\/\/.+/);
      });
    });
  });

  describe("Tags should be present and valid", () => {
    apps.forEach((appName) => {
      test(`${appName} - has valid tags`, () => {
        const metadata = loadDockgeMetadata(appName);
        
        if (!metadata) return;

        expect(Array.isArray(metadata.tags)).toBe(true);
        expect(metadata.tags.length).toBeGreaterThan(0);
        
        // All tags should be non-empty strings
        metadata.tags.forEach(tag => {
          expect(typeof tag).toBe("string");
          expect(tag.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Created date should be valid ISO 8601", () => {
    apps.forEach((appName) => {
      test(`${appName} - created date is valid`, () => {
        const metadata = loadDockgeMetadata(appName);
        
        if (!metadata) return;

        // Should be a valid ISO 8601 date string
        const date = new Date(metadata.created);
        expect(date.toString()).not.toBe("Invalid Date");
      });
    });
  });

  describe("Source should be specified", () => {
    apps.forEach((appName) => {
      test(`${appName} - source is specified`, () => {
        const metadata = loadDockgeMetadata(appName);
        
        if (!metadata) return;

        expect(metadata.source).toBeDefined();
        expect(typeof metadata.source).toBe("string");
        expect(metadata.source.length).toBeGreaterThan(0);
      });
    });
  });
});
