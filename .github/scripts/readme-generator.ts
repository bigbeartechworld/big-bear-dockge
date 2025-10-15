import fs from "fs";
import path from "path";

type DockgeMetadata = {
  name: string;
  id: string;
  description: string;
  tagline: string;
  icon: string;
  thumbnail: string;
  author: string;
  developer: string;
  category: string;
  version: string;
  image: string;
  port: string;
  youtube: string;
  docs: string;
  tags: string[];
  created: string;
  source: string;
};

type App = {
  name: string;
  title: string;
  description: string;
  dockerImage: string;
  version: string;
  youtubeVideo: string;
  docs: string;
  icon: string;
  category: string;
  port: string;
};

const getAppsList = async () => {
  const apps: Record<string, App> = {};
  
  // Get list of app directories in the Apps folder
  const repoRoot = path.join(__dirname, "../..");
  const appsDir = path.join(repoRoot, "Apps");
  
  if (!fs.existsSync(appsDir)) {
    console.warn("Apps directory not found");
    return { apps, count: 0 };
  }
  
  const appDirs = fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .filter((dirent) => !dirent.name.startsWith("."))
    .map((dirent) => dirent.name);

  console.log(`Found ${appDirs.length} app directories`);

  for (const appName of appDirs) {
    const metadataPath = path.join(appsDir, appName, "metadata.json");
    
    if (!fs.existsSync(metadataPath)) {
      console.warn(`No metadata.json found for ${appName}, skipping`);
      continue;
    }

    try {
      const metadataContent = fs.readFileSync(metadataPath, "utf8");
      const metadata: DockgeMetadata = JSON.parse(metadataContent);
      
      apps[appName] = {
        name: metadata.id,
        title: metadata.name,
        description: metadata.description,
        dockerImage: metadata.image,
        version: metadata.version,
        youtubeVideo: metadata.youtube || "",
        docs: metadata.docs || "",
        icon: metadata.icon,
        category: metadata.category || "Uncategorized",
        port: metadata.port || "",
      };
    } catch (e) {
      console.error(`Error parsing metadata for ${appName}: ${(e as Error).message}`);
    }
  }

  return { apps, count: Object.keys(apps).length };
};

const appToMarkdownTable = (apps: Record<string, App>) => {
  let table = `| Application | Docker Image | Version | Port | Category | YouTube Video | Docs |\n`;
  table += `| --- | --- | --- | --- | --- | --- | --- |\n`;

  // Sort apps alphabetically by title
  const sortedApps = Object.values(apps).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  sortedApps.forEach((app) => {
    const youtubeLink = app.youtubeVideo
      ? `[YouTube Video](${app.youtubeVideo})`
      : "";
    const docsLink = app.docs ? `[Docs](${app.docs})` : "";
    const port = app.port || "N/A";

    table += `| ${app.title} | ${app.dockerImage} | ${app.version} | ${port} | ${app.category} | ${youtubeLink} | ${docsLink} |\n`;
  });

  return table;
};

const writeToReadme = (appsTable: string, appCount: number) => {
  const templatePath = path.join(__dirname, "../../templates/README.md");
  const outputPath = path.join(__dirname, "../../README.md");
  
  const baseReadme = fs.readFileSync(templatePath, "utf8");
  let finalReadme = baseReadme.replace("<!appsList>", appsTable);
  finalReadme = finalReadme.replace("<!appCount>", appCount.toString());
  
  fs.writeFileSync(outputPath, finalReadme);
  
  console.log(`✅ README.md generated with ${appCount} apps`);
};

const main = async () => {
  console.log("🚀 Starting Dockge README generation...");
  
  const { apps, count } = await getAppsList();
  
  if (count === 0) {
    console.warn("⚠️  No apps found! README will be empty.");
  }
  
  const markdownTable = appToMarkdownTable(apps);
  writeToReadme(markdownTable, count);
  
  console.log("✨ Done!");
};

main().catch((error) => {
  console.error("❌ Error generating README:", error);
  process.exit(1);
});
