const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const TENANTS_DIR = path.join(DATA_DIR, "tenants");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TENANTS_DIR)) {
    fs.mkdirSync(TENANTS_DIR, { recursive: true });
  }
}

function safeTenantId(tenantId) {
  const id = String(tenantId || "default").trim();
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) {
    throw new Error("Tenant non valido.");
  }
  return id;
}

function tenantPath(tenantId) {
  return path.join(TENANTS_DIR, `${safeTenantId(tenantId)}.json`);
}

function readJSON(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return Array.isArray(override) ? override : base;
  }

  if (typeof base !== "object" || base === null) {
    return override;
  }

  if (typeof override !== "object" || override === null) {
    return base;
  }

  const output = { ...base };

  for (const [key, value] of Object.entries(override)) {
    output[key] = key in output ? deepMerge(output[key], value) : value;
  }

  return output;
}

function loadTenantConfig(tenantId = "default") {
  ensureDirs();

  const defaultPath = tenantPath("default");
  if (!fs.existsSync(defaultPath)) {
    throw new Error("Config tenant default mancante in data/tenants/default.json");
  }

  const baseConfig = readJSON(defaultPath);
  const id = safeTenantId(tenantId);

  if (id === "default") {
    return baseConfig;
  }

  const customPath = tenantPath(id);
  if (!fs.existsSync(customPath)) {
    return { ...baseConfig, tenantId: id };
  }

  const customConfig = readJSON(customPath);
  return deepMerge({ ...baseConfig, tenantId: id }, customConfig);
}

function saveTenantConfig(tenantId, config) {
  ensureDirs();
  const id = safeTenantId(tenantId);
  const fullConfig = { ...config, tenantId: id };
  fs.writeFileSync(tenantPath(id), JSON.stringify(fullConfig, null, 2));
  return fullConfig;
}

function appendNdjson(fileName, payload) {
  ensureDirs();
  const targetPath = path.join(DATA_DIR, fileName);
  const line = JSON.stringify({
    at: new Date().toISOString(),
    ...payload
  });
  fs.appendFileSync(targetPath, `${line}\n`);
}

function getPublicConfig(config) {
  return {
    tenantId: config.tenantId,
    brandName: config.brandName,
    ui: config.ui,
    options: config.options,
    contactPrompt: config.contactPrompt,
    security: {
      allowedEmbedHosts: config?.security?.allowedEmbedHosts || []
    }
  };
}

module.exports = {
  ensureDirs,
  safeTenantId,
  loadTenantConfig,
  saveTenantConfig,
  appendNdjson,
  getPublicConfig
};
