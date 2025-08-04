#!/usr/bin/env node

/**
 * DevContainer Configuration Validator
 * Validates the devcontainer.json file before applying changes
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Valid devcontainer properties based on the official schema
const VALID_PROPERTIES = [
  'name', 'image', 'build', 'features', 'customizations', 'forwardPorts',
  'postCreateCommand', 'postStartCommand', 'postAttachCommand', 'initializeCommand',
  'onCreateCommand', 'updateContentCommand', 'remoteUser', 'containerUser',
  'mounts', 'runArgs', 'containerEnv', 'remoteEnv', 'portsAttributes',
  'otherPortsAttributes', 'shutdownAction', 'overrideCommand', 'workspaceFolder',
  'workspaceMount', 'settings', 'extensions', 'userEnvProbe', 'hostRequirements',
  'updateRemoteUserUID', 'containerUser', 'securityOpt', 'capAdd', 'privileged'
];

// Known good feature IDs
const VALID_FEATURES = [
  'ghcr.io/devcontainers/features/docker-in-docker',
  'ghcr.io/devcontainers/features/docker-outside-of-docker',
  'ghcr.io/devcontainers/features/node',
  'ghcr.io/devcontainers/features/git',
  'ghcr.io/devcontainers/features/github-cli',
  'ghcr.io/devcontainers/features/postgresql-client',
  'ghcr.io/devcontainers/features/python',
  'ghcr.io/devcontainers/features/go',
  'ghcr.io/devcontainers/features/rust',
  'ghcr.io/devcontainers/features/java',
  'ghcr.io/devcontainers/features/dotnet',
  'ghcr.io/devcontainers/features/php',
  'ghcr.io/devcontainers/features/ruby',
  'ghcr.io/devcontainers/features/terraform',
  'ghcr.io/devcontainers/features/kubectl-helm-minikube',
  'ghcr.io/devcontainers/features/azure-cli',
  'ghcr.io/devcontainers/features/aws-cli',
  'ghcr.io/devcontainers/features/gcloud-cli'
];

// Valid images from Microsoft Container Registry
const VALID_IMAGES_PATTERNS = [
  /^mcr\.microsoft\.com\/devcontainers\//,
  /^mcr\.microsoft\.com\/vscode\/devcontainers\//,
  /^node:/,
  /^python:/,
  /^ubuntu:/,
  /^debian:/,
  /^alpine:/
];

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content);
    return { valid: true, config, content };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function validateProperties(config) {
  const errors = [];
  const warnings = [];
  
  // Check for unknown properties
  Object.keys(config).forEach(key => {
    if (!VALID_PROPERTIES.includes(key)) {
      warnings.push(`Unknown property: "${key}"`);
    }
  });
  
  // Validate required properties
  if (!config.name) {
    warnings.push('Missing recommended property: "name"');
  }
  
  if (!config.image && !config.build) {
    errors.push('Must specify either "image" or "build"');
  }
  
  if (config.image && config.build) {
    errors.push('Cannot specify both "image" and "build"');
  }
  
  return { errors, warnings };
}

function validateImage(config) {
  const errors = [];
  
  if (config.image) {
    const validImage = VALID_IMAGES_PATTERNS.some(pattern => pattern.test(config.image));
    if (!validImage) {
      errors.push(`Unrecognized image: "${config.image}". Consider using official devcontainer images.`);
    }
  }
  
  return errors;
}

function validateFeatures(config) {
  const errors = [];
  const warnings = [];
  
  if (config.features) {
    Object.keys(config.features).forEach(featureId => {
      // Check if it's a known feature
      const isKnownFeature = VALID_FEATURES.some(validId => featureId.startsWith(validId));
      
      if (!isKnownFeature) {
        // Check if it follows the expected pattern
        if (!featureId.match(/^ghcr\.io\/[\w-]+\/[\w-]+\/[\w-]+/)) {
          warnings.push(`Unusual feature ID format: "${featureId}"`);
        }
      }
      
      // Validate feature configuration
      const featureConfig = config.features[featureId];
      if (typeof featureConfig === 'object' && featureConfig !== null) {
        // Check for common misconfigurations
        if ('version' in featureConfig && featureConfig.version === '') {
          warnings.push(`Empty version string for feature "${featureId}"`);
        }
      }
    });
  }
  
  return { errors, warnings };
}

function validatePorts(config) {
  const warnings = [];
  
  if (config.forwardPorts) {
    if (!Array.isArray(config.forwardPorts)) {
      return ['forwardPorts must be an array'];
    }
    
    config.forwardPorts.forEach((port, index) => {
      if (typeof port !== 'number' && typeof port !== 'string') {
        warnings.push(`Invalid port at index ${index}: must be a number or string`);
      }
      
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        warnings.push(`Invalid port number at index ${index}: ${port}`);
      }
    });
  }
  
  return warnings;
}

function validateCommands(config) {
  const warnings = [];
  const commandFields = [
    'postCreateCommand', 'postStartCommand', 'postAttachCommand',
    'initializeCommand', 'onCreateCommand', 'updateContentCommand'
  ];
  
  commandFields.forEach(field => {
    if (config[field]) {
      // Check if command exists and is executable
      if (typeof config[field] === 'string') {
        if (config[field].startsWith('./') || config[field].startsWith('/')) {
          warnings.push(`${field}: Ensure script "${config[field]}" exists and is executable`);
        }
      }
    }
  });
  
  return warnings;
}

function validateMounts(config) {
  const errors = [];
  
  if (config.mounts) {
    if (!Array.isArray(config.mounts)) {
      return ['mounts must be an array'];
    }
    
    config.mounts.forEach((mount, index) => {
      if (typeof mount === 'string') {
        // Basic validation for string format
        if (!mount.includes('source=') || !mount.includes('target=')) {
          errors.push(`Mount at index ${index} missing source or target`);
        }
      } else if (typeof mount === 'object') {
        if (!mount.source || !mount.target) {
          errors.push(`Mount at index ${index} missing source or target`);
        }
      }
    });
  }
  
  return errors;
}

function checkDependencies(config) {
  const warnings = [];
  
  // Check for Docker-in-Docker specific requirements
  if (config.features && config.features['ghcr.io/devcontainers/features/docker-in-docker:2']) {
    // Check if privileged mode or appropriate mounts are set
    const hasDockerSocket = config.mounts && config.mounts.some(mount => 
      mount.includes('/var/run/docker.sock')
    );
    
    const hasPrivileged = config.runArgs && config.runArgs.includes('--privileged');
    
    if (!hasDockerSocket && !hasPrivileged) {
      warnings.push('Docker-in-Docker feature may require privileged mode or docker socket mount');
    }
  }
  
  return warnings;
}

function main() {
  const devcontainerPath = path.join(__dirname, 'devcontainer.json');
  
  log('🔍 DevContainer Configuration Validator', 'blue');
  log('=====================================\n', 'blue');
  
  // Validate JSON syntax
  log('Checking JSON syntax...', 'yellow');
  const { valid, config, error } = validateJSON(devcontainerPath);
  
  if (!valid) {
    log(`❌ Invalid JSON: ${error}`, 'red');
    process.exit(1);
  }
  
  log('✅ Valid JSON syntax', 'green');
  
  // Validate properties
  log('\nValidating properties...', 'yellow');
  const propValidation = validateProperties(config);
  
  // Validate image
  const imageErrors = validateImage(config);
  propValidation.errors.push(...imageErrors);
  
  // Validate features
  const featureValidation = validateFeatures(config);
  propValidation.errors.push(...featureValidation.errors);
  propValidation.warnings.push(...featureValidation.warnings);
  
  // Validate ports
  const portWarnings = validatePorts(config);
  propValidation.warnings.push(...portWarnings);
  
  // Validate commands
  const commandWarnings = validateCommands(config);
  propValidation.warnings.push(...commandWarnings);
  
  // Validate mounts
  const mountErrors = validateMounts(config);
  propValidation.errors.push(...mountErrors);
  
  // Check dependencies
  const depWarnings = checkDependencies(config);
  propValidation.warnings.push(...depWarnings);
  
  // Report results
  if (propValidation.errors.length > 0) {
    log('\n❌ Errors found:', 'red');
    propValidation.errors.forEach(err => log(`  - ${err}`, 'red'));
  }
  
  if (propValidation.warnings.length > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    propValidation.warnings.forEach(warn => log(`  - ${warn}`, 'yellow'));
  }
  
  if (propValidation.errors.length === 0) {
    log('\n✅ Configuration is valid!', 'green');
    
    // Additional checks
    log('\n📋 Configuration Summary:', 'blue');
    log(`  - Name: ${config.name || 'Not specified'}`, 'blue');
    log(`  - Image: ${config.image || 'Not specified'}`, 'blue');
    log(`  - Features: ${Object.keys(config.features || {}).length}`, 'blue');
    log(`  - Forward Ports: ${config.forwardPorts ? config.forwardPorts.length : 0}`, 'blue');
    
    if (config.features) {
      log('\n  Configured Features:', 'blue');
      Object.keys(config.features).forEach(feature => {
        log(`    - ${feature}`, 'blue');
      });
    }
    
    return 0;
  }
  
  return 1;
}

// Run validation
const exitCode = main();
process.exit(exitCode);