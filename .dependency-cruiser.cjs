/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular-dependencies",
      severity: "error",
      from: {},
      to: { circular: true }
    },
    {
      name: "no-composition-imports-outside-entrypoints",
      comment:
        "Only composition root entrypoints can depend on composition modules directly.",
      severity: "error",
      from: {
        pathNot:
          "^src/(server\\.js|container\\.js|services/aiService\\.js|composition/.*)$"
      },
      to: { path: "^src/composition/" }
    },
    {
      name: "application-must-not-depend-on-adapters-or-infrastructure",
      comment:
        "Application layer should stay independent from infrastructure and delivery concerns.",
      severity: "error",
      from: { path: "^src/application/" },
      to: {
        path: "^src/(controllers|routes|middlewares|infrastructure|composition)/"
      }
    },
    {
      name: "application-must-not-depend-on-concrete-data-implementations",
      comment:
        "Application layer can use ports, but not concrete models/repositories/services.",
      severity: "error",
      from: { path: "^src/application/" },
      to: { path: "^src/(models|repositories|services)/" }
    },
    {
      name: "adapters-must-not-import-infrastructure-directly",
      comment:
        "Routes/controllers/middlewares should access infrastructure through services/use-cases.",
      severity: "error",
      from: { path: "^src/(controllers|routes|middlewares)/" },
      to: { path: "^src/infrastructure/" }
    },
    {
      name: "infrastructure-must-not-depend-on-adapters",
      severity: "error",
      from: { path: "^src/infrastructure/" },
      to: { path: "^src/(controllers|routes|middlewares|composition)/" }
    }
  ],
  options: {
    includeOnly: "^src",
    doNotFollow: {
      path: "node_modules"
    },
    tsPreCompilationDeps: false,
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+"
      }
    }
  }
};
