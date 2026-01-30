class AITechStackManager {
    constructor() {
        this.techData = [];
        this.aiInsights = new Map();
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.apiEndpoints = {
            // Using free APIs and AI analysis
            versions: 'https://api.github.com/repos', // GitHub API for open source projects
            npm: 'https://registry.npmjs.org',
            pypi: 'https://pypi.org/pypi',
            endoflife: 'https://endoflife.date/api',
            osv: 'https://api.osv.dev/v1/query' // OSV vulnerability database
        };
        // Local AI configuration
        this.localAI = {
            ollamaURL: 'http://localhost:11434',
            defaultModel: 'llama3.2:3b',
            enabled: localStorage.getItem('localAI_enabled') === 'true',
            available: false
        };
        this.currentProductFilter = ''; // Initialize product filter
        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupEventListeners();
        this.loadStoredData();
        this.filteredData = [...this.techData]; // Initialize filtered data
        this.renderStats();
        this.renderTechCards();
        this.updateLastSync();
        
        // Initialize local AI
        await this.initializeLocalAI();
        
        // Auto-sync every 5 minutes
        setInterval(() => this.backgroundSync(), 5 * 60 * 1000);
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle.querySelector('i');
        icon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Add technology form
        document.getElementById('addTechForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTechnology();
        });

        // Technology name autocomplete
        document.getElementById('techName').addEventListener('input', (e) => {
            this.showSuggestions(e.target.value);
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterData();
        });

        // Filters
        document.getElementById('priorityFilter').addEventListener('change', () => {
            this.filterData();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortData(e.target.value);
        });

        // AI Analysis
        document.getElementById('aiAnalyzeAll').addEventListener('click', () => {
            this.aiAnalyzeAll();
        });

        // Import/Export
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importData').addEventListener('click', () => {
            this.showImportModal();
        });

        document.getElementById('removeAllData').addEventListener('click', () => {
            this.showRemoveAllConfirmation();
        });

        // Product tabs
        document.getElementById('productTabs').addEventListener('click', (e) => {
            if (e.target.closest('.tab-button')) {
                const button = e.target.closest('.tab-button');
                const product = button.dataset.product;
                this.switchToProduct(product);
            }
        });

        // Modal controls
        document.getElementById('closeImportModal').addEventListener('click', () => {
            this.hideImportModal();
        });

        document.getElementById('cancelImport').addEventListener('click', () => {
            this.hideImportModal();
        });

        document.getElementById('processImport').addEventListener('click', () => {
            this.processImport();
        });

        // Recommendations
        document.getElementById('closeRecommendations').addEventListener('click', () => {
            this.hideRecommendations();
        });

        // Click outside suggestions to hide
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.form-group')) {
                this.hideSuggestions();
            }
        });
    }

    showSuggestions(query) {
        // No autocomplete suggestions - let users enter any technology
        this.hideSuggestions();
    }

    hideSuggestions() {
        document.getElementById('techSuggestions').style.display = 'none';
    }

    async addTechnology() {
        const techName = document.getElementById('techName').value.trim();
        const currentVersion = document.getElementById('currentVersion').value.trim();
        const product = document.getElementById('product').value.trim();

        if (!techName || !currentVersion || !product) {
            this.showError('Please fill in all required fields (Technology, Version, and Product)');
            return;
        }

        this.showLoading('Adding and analyzing technology...');

        try {
            const techData = await this.aiAnalyzeTechnology(techName, currentVersion, product);
            this.techData.push(techData);
            this.saveData();
            this.renderStats();
            this.renderTechCards();
            this.updateProductTabs(); // Update product tabs with new product
            this.clearForm();
            this.hideLoading();
            
            // Show recommendations if any critical issues found
            if (techData.aiPriority === 'critical') {
                this.showMessage(`⚠️ Critical: ${techData.technology} requires immediate attention. Check recommendations for upgrade details.`, 'warning');
            }
        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to analyze technology: ${error.message}`);
        }
    }

    async aiAnalyzeTechnology(name, currentVersion, product) {
        const techData = {
            id: Date.now().toString(),
            technology: name,
            currentVersion: currentVersion,
            product: product,
            addedDate: new Date().toISOString(),
            lastAnalyzed: new Date().toISOString()
        };

        // Try to get latest version from multiple API sources
        try {
            const versionInfo = await this.fetchLatestVersionFromAPIs(name);
            techData.latestVersion = versionInfo.latest;
            techData.checkUrl = versionInfo.url;
            techData.detectedType = versionInfo.type;
        } catch (error) {
            console.warn(`Failed to fetch version for ${name}:`, error);
            techData.latestVersion = 'Unknown';
            techData.checkUrl = `https://www.google.com/search?q=${encodeURIComponent(name + ' latest version')}`;
        }

        // Try to get EOL information
        try {
            const eolInfo = await this.fetchEOLFromAPIs(name, currentVersion);
            if (eolInfo) {
                techData.eolDate = eolInfo.eol;
                techData.supportStatus = eolInfo.support;
                techData.eolSource = eolInfo.source;
                techData.eolCycle = eolInfo.cycle;
            }
        } catch (error) {
            console.warn(`Failed to fetch EOL info for ${name}:`, error);
        }

        // Check for vulnerabilities
        try {
            const vulnInfo = await this.checkVulnerabilities(name, currentVersion, techData.detectedType);
            if (vulnInfo) {
                techData.vulnerabilities = vulnInfo.vulnerabilities;
                techData.vulnerabilityCount = vulnInfo.count;
                techData.criticalVulns = vulnInfo.critical;
                techData.highVulns = vulnInfo.high;
                techData.securityScore = vulnInfo.securityScore;
                techData.lastSecurityCheck = new Date().toISOString();
            }
        } catch (error) {
            console.warn(`Failed to check vulnerabilities for ${name}:`, error);
        }

        // Check for vulnerabilities
        try {
            const vulnInfo = await this.checkVulnerabilities(name, currentVersion, techData.detectedType);
            if (vulnInfo) {
                techData.vulnerabilities = vulnInfo.vulnerabilities;
                techData.vulnerabilityCount = vulnInfo.count;
                techData.criticalVulns = vulnInfo.critical;
                techData.highVulns = vulnInfo.high;
                techData.securityScore = vulnInfo.securityScore;
                techData.lastSecurityCheck = new Date().toISOString();
            }
        } catch (error) {
            console.warn(`Failed to check vulnerabilities for ${name}:`, error);
        }

        // Perform AI Analysis (or rule-based fallback)
        const analysis = await this.performAIAnalysis(techData);
        Object.assign(techData, analysis);

        return techData;
    }

    async fetchLatestVersionFromAPIs(techName) {
        const normalizedName = techName.toLowerCase();
        const results = [];
        
        // Smart API selection based on technology type
        const apiOrder = this.getAPIOrderForTech(normalizedName);
        
        for (const apiType of apiOrder) {
            try {
                let result = null;
                
                switch (apiType) {
                    case 'npm':
                        result = await this.tryNpmAPI(normalizedName);
                        break;
                    case 'pypi':
                        result = await this.tryPyPIAPI(normalizedName);
                        break;
                    case 'github':
                        result = await this.tryGitHubAPI(normalizedName);
                        break;
                    case 'official':
                        result = await this.tryOfficialSources(normalizedName);
                        break;
                    case 'eol':
                        result = await this.tryEOLAPI(normalizedName);
                        break;
                }
                
                if (result) {
                    results.push(result);
                    break; // Use first successful result
                }
            } catch (error) {
                console.warn(`${apiType} check failed for ${normalizedName}:`, error);
                continue;
            }
        }
        
        // Return the first successful result, or throw if none found
        if (results.length > 0) {
            return results[0];
        }
        
        throw new Error(`No version information found for ${techName}`);
    }
    
    getAPIOrderForTech(techName) {
        // Define which APIs to try first based on technology type
        const apiPriority = {
            // Programming Languages - try EOL API first for official version info
            'java': ['eol', 'github'],
            'jdk': ['eol', 'github'],
            'openjdk': ['eol', 'github'],
            'oracle-jdk': ['eol', 'github'],
            'python': ['eol', 'pypi'],
            'node': ['eol', 'npm', 'github'],
            'nodejs': ['eol', 'npm', 'github'],
            'node.js': ['eol', 'npm', 'github'],
            'go': ['eol', 'github'],
            'golang': ['eol', 'github'],
            'rust': ['eol', 'github'],
            'php': ['eol', 'github'],
            'ruby': ['eol', 'github'],
            'dotnet': ['eol', 'github'],
            '.net': ['eol', 'github'],
            'csharp': ['eol', 'github'],
            'c#': ['eol', 'github'],
            
            // Frontend frameworks - try EOL API first for version info
            'react': ['eol', 'npm', 'github'],
            'vue': ['eol', 'npm', 'github'],
            'angular': ['eol', 'npm', 'github'],
            'svelte': ['npm', 'github'],
            'nextjs': ['eol', 'npm', 'github'],
            'next.js': ['eol', 'npm', 'github'],
            'nuxt': ['eol', 'npm', 'github'],
            'typescript': ['npm', 'github'],
            'webpack': ['npm', 'github'],
            'vite': ['npm', 'github'],
            'babel': ['npm', 'github'],
            'eslint': ['npm', 'github'],
            'prettier': ['npm', 'github'],
            
            // Backend frameworks - EOL API where available
            'express': ['eol', 'npm', 'github'],
            'fastapi': ['pypi', 'github'],
            'django': ['eol', 'pypi', 'github'],
            'flask': ['pypi', 'github'],
            'spring': ['eol', 'github'],
            'spring-boot': ['eol', 'github'],
            'rails': ['eol', 'github'],
            'laravel': ['eol', 'github'],
            
            // Databases and Infrastructure - EOL API first for official lifecycle info
            'postgresql': ['eol', 'github'],
            'postgres': ['eol', 'github'],
            'mysql': ['eol', 'github'],
            'mongodb': ['eol', 'github'],
            'redis': ['eol', 'github'],
            'elasticsearch': ['eol', 'github'],
            'docker': ['eol', 'github'],
            'kubernetes': ['eol', 'github'],
            'k8s': ['eol', 'github'],
            
            // AWS Services - EOL API available
            'eks': ['eol'],
            'amazon-eks': ['eol'],
            'aws-eks': ['eol'],
            'rds': ['eol'],
            'amazon-rds-postgresql': ['eol'],
            'amazon-rds-mysql': ['eol'],
            'amazon-rds-mariadb': ['eol'],
            'aws-lambda': ['eol'],
            'lambda': ['eol'],
            
            // Azure Services
            'aks': ['eol'],
            'azure-kubernetes-service': ['eol'],
            'azure-devops-server': ['eol'],
            
            // Google Cloud Services
            'gke': ['eol'],
            'google-kubernetes-engine': ['eol'],
            'docker': ['official', 'github'],
            'kubernetes': ['official', 'github'],
            'nginx': ['official', 'github'],
            'apache': ['official', 'github']
        };
        
        return apiPriority[techName] || ['npm', 'pypi', 'github', 'official'];
    }
    
    async tryNpmAPI(techName) {
        const url = `${this.apiEndpoints.npm}/${techName}/latest`;
        console.log('📦 [NPM DEBUG] API Request:', {
            url: url,
            techName: techName
        });
        
        const npmResponse = await fetch(url);
        console.log('📦 [NPM DEBUG] API Response Status:', npmResponse.status, npmResponse.statusText);
        
        if (npmResponse.ok) {
            const data = await npmResponse.json();
            console.log('📦 [NPM DEBUG] API Response Data:', {
                techName: techName,
                version: data.version,
                hasVersion: !!data.version
            });
            return {
                latest: data.version,
                url: `https://www.npmjs.com/package/${techName}`,
                type: 'npm-package'
            };
        }
        return null;
    }
    
    async tryPyPIAPI(techName) {
        const url = `${this.apiEndpoints.pypi}/${techName}/json`;
        console.log('🐍 [PyPI DEBUG] API Request:', {
            url: url,
            techName: techName
        });
        
        const pypiResponse = await fetch(url);
        console.log('🐍 [PyPI DEBUG] API Response Status:', pypiResponse.status, pypiResponse.statusText);
        
        if (pypiResponse.ok) {
            const data = await pypiResponse.json();
            console.log('🐍 [PyPI DEBUG] API Response Data:', {
                techName: techName,
                version: data.info?.version,
                hasInfo: !!data.info
            });
            return {
                latest: data.info.version,
                url: `https://pypi.org/project/${techName}/`,
                type: 'python-package'
            };
        }
        return null;
    }
    
    async tryGitHubAPI(techName) {
        const githubRepos = this.getCommonGitHubRepos(techName);
        console.log('🐙 [GitHub DEBUG] Starting repo checks:', {
            techName: techName,
            repos: githubRepos
        });
        
        for (const repo of githubRepos) {
            try {
                const url = `${this.apiEndpoints.versions}/${repo}/releases/latest`;
                console.log('🐙 [GitHub DEBUG] API Request:', {
                    url: url,
                    techName: techName,
                    repo: repo
                });
                
                const githubResponse = await fetch(url);
                console.log('🐙 [GitHub DEBUG] API Response Status:', {
                    repo: repo,
                    status: githubResponse.status,
                    statusText: githubResponse.statusText
                });
                
                if (githubResponse.ok) {
                    const data = await githubResponse.json();
                    console.log('🐙 [GitHub DEBUG] API Response Data:', {
                        techName: techName,
                        repo: repo,
                        tagName: data.tag_name,
                        cleanedVersion: data.tag_name?.replace(/^v/, '')
                    });
                    return {
                        latest: data.tag_name.replace(/^v/, ''),
                        url: `https://github.com/${repo}/releases`,
                        type: 'github-release'
                    };
                }
            } catch (error) {
                console.warn('🐙 [GitHub DEBUG] API Error:', {
                    repo: repo,
                    error: error.message
                });
                continue; // Try next repo
            }
        }
        return null;
    }
    
    async tryOfficialSources(techName) {
        // Only use real API data - no hardcoded versions
        // This method now serves as a placeholder for future official API integrations
        return null;
    }
    
    async tryEOLAPI(techName) {
        try {
            const normalizedName = techName.toLowerCase();
            
            // Map language, framework, and infrastructure variants to their EOL API names
            const eolApiMapping = {
                // Programming Languages
                'java': 'oracle-jdk',
                'jdk': 'oracle-jdk', 
                'openjdk': 'openjdk-builds-from-oracle',
                'oracle-jdk': 'oracle-jdk',
                'python': 'python',
                'node': 'nodejs',
                'nodejs': 'nodejs', 
                'node.js': 'nodejs',
                'go': 'go',
                'golang': 'go',
                'rust': 'rust',
                'php': 'php',
                'ruby': 'ruby',
                'dotnet': 'dotnet',
                '.net': 'dotnet',
                'csharp': 'dotnet',
                'c#': 'dotnet',
                // Frontend Frameworks
                'react': 'react',
                'vue': 'vue',
                'angular': 'angular',
                'nextjs': 'nextjs',
                'next.js': 'nextjs',
                'nuxt': 'nuxt',
                // Backend Frameworks
                'express': 'express',
                'django': 'django',
                'spring': 'spring-framework',
                'spring-boot': 'spring-boot',
                'rails': 'rails',
                'laravel': 'laravel',
                // Databases
                'postgresql': 'postgresql',
                'postgres': 'postgresql',
                'mysql': 'mysql',
                'mongodb': 'mongodb',
                'redis': 'redis',
                'elasticsearch': 'elasticsearch',
                // Container & Orchestration
                'docker': 'docker-engine',
                'kubernetes': 'kubernetes',
                'k8s': 'kubernetes',
                // AWS Services
                'eks': 'amazon-eks',
                'amazon-eks': 'amazon-eks',
                'aws-eks': 'amazon-eks',
                'rds': 'amazon-rds-postgresql',
                'amazon-rds-postgresql': 'amazon-rds-postgresql',
                'amazon-rds-mysql': 'amazon-rds-mysql', 
                'amazon-rds-mariadb': 'amazon-rds-mariadb',
                'aws-lambda': 'aws-lambda',
                'lambda': 'aws-lambda',
                // Azure Services
                'aks': 'azure-kubernetes-service',
                'azure-kubernetes-service': 'azure-kubernetes-service',
                'azure-devops-server': 'azure-devops-server',
                // Google Cloud Services
                'gke': 'google-kubernetes-engine',
                'google-kubernetes-engine': 'google-kubernetes-engine'
            };
            
            const apiName = eolApiMapping[normalizedName] || normalizedName;
            const url = `${this.apiEndpoints.endoflife}/${apiName}.json`;
            
            console.log('📅 [EOL DEBUG] API Request:', {
                url: url,
                techName: techName,
                normalizedName: normalizedName,
                apiName: apiName
            });
            
            const response = await fetch(url);
            console.log('📅 [EOL DEBUG] API Response Status:', {
                techName: techName,
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            });
            
            if (!response.ok) {
                return null;
            }
            
            const data = await response.json();
            console.log('📅 [EOL DEBUG] API Response Data:', {
                techName: techName,
                apiName: apiName,
                isArray: Array.isArray(data),
                dataLength: Array.isArray(data) ? data.length : 'not array',
                firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null
            });
            
            if (!Array.isArray(data) || data.length === 0) {
                return null;
            }
            
            // Get the latest version info
            const latest = data[0];
            
            const result = {
                latest: latest.latest || latest.cycle,
                releaseDate: latest.latestReleaseDate || latest.releaseDate,
                isSecure: latest.eol ? new Date(latest.eol) > new Date() : true,
                eolInfo: {
                    eol: latest.eol,
                    support: latest.support,
                    lts: latest.lts,
                    cycle: latest.cycle
                }
            };
            
            console.log('📅 [EOL DEBUG] Processed Result:', {
                techName: techName,
                result: result
            });
            
            return result;
        } catch (error) {
            console.warn(`EOL API check failed for ${techName}:`, error);
            return null;
        }
    }
    
    getEOLApiName(normalizedName) {
        // Check cached discoveries first
        const cached = this.getCachedEOLMappings();
        if (cached[normalizedName]) {
            return cached[normalizedName];
        }
        
        // Static mappings for known technologies
        const eolApiMapping = {
            // Programming Languages
            'java': 'oracle-jdk',
            'jdk': 'oracle-jdk', 
            'openjdk': 'openjdk-builds-from-oracle',
            'oracle-jdk': 'oracle-jdk',
            'python': 'python',
            'node': 'nodejs',
            'nodejs': 'nodejs', 
            'node.js': 'nodejs',
            'go': 'go',
            'golang': 'go',
            'rust': 'rust',
            'php': 'php',
            'ruby': 'ruby',
            'dotnet': 'dotnet',
            '.net': 'dotnet',
            'csharp': 'dotnet',
            'c#': 'dotnet',
            // Frontend Frameworks
            'react': 'react',
            'vue': 'vue',
            'angular': 'angular',
            'nextjs': 'nextjs',
            'next.js': 'nextjs',
            'nuxt': 'nuxt',
            // Backend Frameworks
            'express': 'express',
            'django': 'django',
            'spring': 'spring-framework',
            'spring-boot': 'spring-boot',
            'rails': 'rails',
            'laravel': 'laravel',
            // Databases
            'postgresql': 'postgresql',
            'postgres': 'postgresql',
            'mysql': 'mysql',
            'mongodb': 'mongodb',
            'redis': 'redis',
            'elasticsearch': 'elasticsearch',
            // Container & Orchestration
            'docker': 'docker-engine',
            'kubernetes': 'kubernetes',
            'k8s': 'kubernetes',
            // AWS Services
            'eks': 'amazon-eks',
            'amazon-eks': 'amazon-eks',
            'aws-eks': 'amazon-eks',
            'rds': 'amazon-rds-postgresql',
            'amazon-rds-postgresql': 'amazon-rds-postgresql',
            'amazon-rds-mysql': 'amazon-rds-mysql', 
            'amazon-rds-mariadb': 'amazon-rds-mariadb',
            'aws-lambda': 'aws-lambda',
            'lambda': 'aws-lambda',
            // Azure Services
            'aks': 'azure-kubernetes-service',
            'azure-kubernetes-service': 'azure-kubernetes-service',
            'azure-devops-server': 'azure-devops-server',
            // Google Cloud Services
            'gke': 'google-kubernetes-engine',
            'google-kubernetes-engine': 'google-kubernetes-engine'
        };
        
        return eolApiMapping[normalizedName];
    }
    
    async discoverEOLApiName(techName) {
        try {
            console.log(`🔍 Auto-discovering EOL API for: ${techName}`);
            
            // Show discovery status to user
            this.showDiscoveryStatus(techName);
            
            // Strategy 1: Try exact name
            const exactMatch = await this.testEOLEndpoint(techName);
            if (exactMatch) {
                console.log(`✅ Found exact match: ${techName}`);
                this.hideDiscoveryStatus();
                return techName;
            }
            
            // Strategy 2: Try common variations
            const variations = this.generateNameVariations(techName);
            for (const variation of variations) {
                const match = await this.testEOLEndpoint(variation);
                if (match) {
                    console.log(`✅ Found variation match: ${variation} for ${techName}`);
                    this.hideDiscoveryStatus();
                    return variation;
                }
            }
            
            // Strategy 3: Try fuzzy matching against all available APIs
            const fuzzyMatch = await this.findFuzzyMatch(techName);
            if (fuzzyMatch) {
                console.log(`✅ Found fuzzy match: ${fuzzyMatch} for ${techName}`);
                this.hideDiscoveryStatus();
                return fuzzyMatch;
            }
            
            console.log(`❌ No EOL API found for: ${techName}`);
            this.hideDiscoveryStatus();
            return null;
        } catch (error) {
            console.warn(`EOL discovery failed for ${techName}:`, error);
            this.hideDiscoveryStatus();
            return null;
        }
    }
    
    async testEOLEndpoint(apiName) {
        try {
            const url = `${this.apiEndpoints.endoflife}/${apiName}.json`;
            console.log('🧪 [EOL DEBUG] Testing endpoint:', url);
            
            const response = await fetch(url);
            console.log('🧪 [EOL DEBUG] Test result:', {
                apiName: apiName,
                status: response.status,
                ok: response.ok
            });
            
            return response.ok;
        } catch (error) {
            console.log('🧪 [EOL DEBUG] Test failed:', {
                apiName: apiName,
                error: error.message
            });
            return false;
        }
    }
    
    generateNameVariations(techName) {
        const variations = [];
        const name = techName.toLowerCase();
        
        // Common patterns
        variations.push(
            name,
            name.replace(/\.js$/, ''),
            name.replace(/^aws-/, 'amazon-'),
            name.replace(/^amazon-/, 'aws-'),
            name.replace(/-/g, ''),
            name.replace(/\s+/g, '-'),
            `${name}-framework`,
            `${name}-js`,
            `${name}-lang`,
            `${name}-language`
        );
        
        return [...new Set(variations)];
    }
    
    async findFuzzyMatch(techName) {
        try {
            // Get all available APIs
            const allApis = await this.getAllEOLApis();
            
            // Simple fuzzy matching
            const matches = allApis.filter(api => 
                api.includes(techName.toLowerCase()) || 
                techName.toLowerCase().includes(api) ||
                this.calculateSimilarity(api, techName.toLowerCase()) > 0.7
            );
            
            return matches.length > 0 ? matches[0] : null;
        } catch (error) {
            console.warn('Fuzzy matching failed:', error);
            return null;
        }
    }
    
    async getAllEOLApis() {
        try {
            // Cache the API list for 1 hour
            const cached = localStorage.getItem('eol-apis-cache');
            const cacheTime = localStorage.getItem('eol-apis-cache-time');
            
            if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 3600000) {
                return JSON.parse(cached);
            }
            
            const response = await fetch(`${this.apiEndpoints.endoflife}/all.json`);
            const apis = await response.json();
            
            localStorage.setItem('eol-apis-cache', JSON.stringify(apis));
            localStorage.setItem('eol-apis-cache-time', Date.now().toString());
            
            return apis;
        } catch (error) {
            console.warn('Failed to get all EOL APIs:', error);
            return [];
        }
    }
    
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    cacheEOLMapping(techName, apiName) {
        const cached = this.getCachedEOLMappings();
        cached[techName] = apiName;
        localStorage.setItem('discovered-eol-mappings', JSON.stringify(cached));
        console.log(`💾 Cached EOL mapping: ${techName} → ${apiName}`);
    }
    
    getCachedEOLMappings() {
        try {
            const cached = localStorage.getItem('discovered-eol-mappings');
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    }
    
    showDiscoveryStatus(techName) {
        // Create or update discovery status indicator
        let statusEl = document.getElementById('discovery-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'discovery-status';
            statusEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--ai-gradient);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: var(--shadow-lg);
                z-index: 1000;
                font-size: 0.9rem;
                animation: pulse 1.5s infinite;
            `;
            document.body.appendChild(statusEl);
        }
        statusEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s infinite linear;"></div>
                <span>🔍 Discovering ${techName} lifecycle data...</span>
            </div>
        `;
        statusEl.style.display = 'block';
    }
    
    hideDiscoveryStatus() {
        const statusEl = document.getElementById('discovery-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }
    
    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-size: 0.9rem;
            z-index: 1001;
            animation: slideIn 0.3s ease;
            background: ${
                type === 'success' ? '#10b981' :
                type === 'error' ? '#ef4444' :
                type === 'warning' ? '#f59e0b' :
                '#3b82f6'
            };
        `;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }
    
    async generateOllamaUpgradePlan(tech) {
        try {
            const prompt = `You are an expert software architect analyzing upgrade requirements for ${tech.technology}.

Current Status:
- Technology: ${tech.technology}
- Current Version: ${tech.version || 'Unknown'}
- Latest Available: ${tech.latest || 'Unknown'}
- EOL Status: ${tech.eolInfo ? JSON.stringify(tech.eolInfo) : 'No EOL data'}
- Security Status: ${tech.isSecure ? 'Secure' : 'Potentially vulnerable'}

CRITICAL VERSION RULES:
- ONLY use the Current Version (${tech.version || 'Unknown'}) and Latest Available (${tech.latest || 'Unknown'}) provided above
- NEVER suggest version numbers not mentioned in this data
- If Latest Available is "Unknown", focus on general maintenance and security practices
- Always recommend upgrading to newer versions, never downgrades

CRITICAL RESPONSE FORMAT RULES:
- Return ONLY ONE JSON object, no explanatory text
- Do not include multiple JSON objects
- Do not include text before or after the JSON
- Do not use numbered lists (1., 2., 3.) inside JSON arrays
- Use proper JSON array format with comma-separated quoted strings

For Frontend Frameworks (React, Vue, Angular):
- Consider breaking changes between major versions
- Plan for dependency compatibility issues (libraries, build tools, testing frameworks)
- Address potential component API changes and lifecycle method updates
- Plan gradual migration strategies for large applications
- Consider codemods and automated migration tools when available

For Backend Frameworks (Express, Django, Spring):
- Review middleware and plugin compatibility
- Consider database migration requirements
- Plan for API endpoint changes and request/response format updates
- Address security configuration updates

For Languages/Runtimes (Node.js, Python, Java):
- Consider syntax and feature changes
- Plan for tooling and IDE support updates
- Address package manager and build system changes
- Review performance implications and optimization opportunities

Return EXACTLY this JSON structure with NO additional text:

{
  "priority": "critical|high|medium|low",
  "recommendation": "Brief recommendation with specific version guidance",
  "targetVersion": "Use ONLY the Latest Available version provided above",
  "timeline": "Suggested timeline (e.g. 'Within 1 week', 'Next quarter')",
  "effort": "low|medium|high",
  "risks": ["risk1", "risk2", "risk3"],
  "benefits": ["benefit1", "benefit2", "benefit3"],
  "steps": ["step1", "step2", "step3", "step4"],
  "testingRequired": ["test1", "test2"],
  "rollbackPlan": "Rollback strategy appropriate for this technology",
  "dependencies": ["dependency1", "dependency2"]
}

Focus on practical, actionable advice. Consider security implications, breaking changes, and business impact specific to ${tech.technology}.

IMPORTANT: Return ONLY the JSON object above, no other text.`;

            const requestPayload = {
                model: this.localAI.defaultModel,
                prompt: prompt,
                stream: false
            };

            console.log('🤖 [AI DEBUG] Ollama Upgrade Plan Request:', {
                url: 'http://localhost:11434/api/generate',
                method: 'POST',
                payload: requestPayload,
                technology: tech.technology
            });

            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload)
            });

            console.log('🤖 [AI DEBUG] Ollama Upgrade Plan Response Status:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('🤖 [AI DEBUG] Ollama Upgrade Plan Response Data:', {
                technology: tech.technology,
                responseLength: data.response?.length || 0,
                response: data.response
            });
            
            return this.parseUpgradePlan(data.response);
        } catch (error) {
            console.error('Upgrade plan generation failed:', error);
            throw error;
        }
    }
    
    // Helper method to clean up numbered list syntax in JSON arrays
    cleanJsonArrays(jsonStr) {
        // Remove numbered list format like "1. ", "2. ", etc. from array items
        // First pass: fix array start with numbered items
        jsonStr = jsonStr.replace(/(\[\s*)\s*(\d+)\.\s+"([^"]*?)"/g, '$1"$3"');
        
        // Second pass: fix subsequent array items with numbered format
        jsonStr = jsonStr.replace(/,\s*(\d+)\.\s+"([^"]*?)"/g, ', "$2"');
        
        // Third pass: handle any remaining standalone numbered items in arrays
        jsonStr = jsonStr.replace(/(\[\s*[^"]*"[^"]*",?\s*)\s*(\d+)\.\s+([^",\]]+)/g, '$1"$3"');
        
        return jsonStr;
    }
    
    parseUpgradePlan(response) {
        try {
            console.log('🤖 [AI DEBUG] Parsing upgrade plan response:', response.substring(0, 500) + '...');
            
            // Strategy 1: Find the first complete JSON object
            const jsonMatch = response.match(/\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g);
            if (jsonMatch) {
                // Try each potential JSON object
                for (const match of jsonMatch) {
                    try {
                        // Clean up common formatting issues
                        let cleanMatch = match
                            .replace(/(\[\s*)\d+\.\s+"/g, '$1"')  // Remove "1. " from array items
                            .replace(/",\s*\d+\.\s+"/g, '", "')   // Remove "2. " from middle items
                            .replace(/"\s*\]/g, '"]')            // Clean up array endings
                            .replace(/\n/g, ' ')                 // Remove newlines
                            .replace(/\s+/g, ' ')                // Normalize whitespace
                            .trim();
                        
                        console.log('🤖 [AI DEBUG] Attempting to parse JSON:', cleanMatch.substring(0, 200) + '...');
                        
                        const parsed = JSON.parse(cleanMatch);
                        if (parsed && typeof parsed === 'object' && parsed.priority && parsed.recommendation) {
                            console.log('🤖 [AI DEBUG] Successfully parsed upgrade plan JSON');
                            return parsed;
                        }
                    } catch (e) {
                        console.warn('🤖 [AI DEBUG] Failed to parse JSON match:', e.message);
                        continue;
                    }
                }
            }
            
            // Strategy 2: Try to extract JSON between code blocks
            const codeBlockMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/i);
            if (codeBlockMatch) {
                try {
                    let jsonStr = codeBlockMatch[1];
                    jsonStr = this.cleanJsonArrays(jsonStr);
                    console.log('🤖 [AI DEBUG] Attempting to parse code block JSON');
                    return JSON.parse(jsonStr);
                } catch (e) {
                    console.warn('🤖 [AI DEBUG] Failed to parse code block JSON:', e.message);
                }
            }
            
            // Strategy 3: Look for JSON after any introductory text
            const lines = response.split('\n');
            let jsonStartIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith('{')) {
                    jsonStartIndex = i;
                    break;
                }
            }
            
            if (jsonStartIndex >= 0) {
                const jsonLines = lines.slice(jsonStartIndex);
                let jsonStr = jsonLines.join('\n');
                
                // Find the end of the JSON object
                let braceCount = 0;
                let endIndex = -1;
                for (let i = 0; i < jsonStr.length; i++) {
                    if (jsonStr[i] === '{') braceCount++;
                    if (jsonStr[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            endIndex = i + 1;
                            break;
                        }
                    }
                }
                
                if (endIndex > 0) {
                    jsonStr = jsonStr.substring(0, endIndex);
                    try {
                        jsonStr = this.cleanJsonArrays(jsonStr);
                        console.log('🤖 [AI DEBUG] Attempting to parse extracted JSON');
                        return JSON.parse(jsonStr);
                    } catch (e) {
                        console.warn('🤖 [AI DEBUG] Failed to parse extracted JSON:', e.message);
                    }
                }
            }
            
            throw new Error('No valid JSON found in response');
        } catch (error) {
            console.error('🤖 [AI DEBUG] Failed to parse upgrade plan:', error.message);
            console.error('🤖 [AI DEBUG] Response was:', response);
            return {
                priority: 'medium',
                recommendation: 'Review and plan upgrade when convenient',
                targetVersion: 'Latest stable version',
                timeline: 'Next maintenance window',
                effort: 'medium',
                risks: ['Potential compatibility issues'],
                benefits: ['Security improvements', 'New features'],
                steps: ['Review release notes', 'Test in staging', 'Deploy to production'],
                testingRequired: ['Unit tests', 'Integration tests'],
                rollbackPlan: 'Keep previous version available for quick rollback',
                dependencies: ['Review dependent packages']
            };
        }
    }
    
    displayUpgradePlanError(modal, tech, errorMessage) {
        const content = modal.querySelector('.modal-content');
        content.innerHTML = `
            <div class="modal-header">
                <h3>❌ Upgrade Plan Error</h3>
                <span class="close-modal" onclick="aiManager.closeModal(this)">&times;</span>
            </div>
            <div class="modal-body">
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <div class="error-content">
                        <h4>Failed to Generate Upgrade Plan for ${this.escapeHtml(tech.technology)}</h4>
                        <p class="error-message">${this.escapeHtml(errorMessage)}</p>
                        <div class="error-suggestions">
                            <h5>Suggestions:</h5>
                            <ul>
                                <li>Ensure Ollama is running on localhost:11434</li>
                                <li>Check if the ${this.localAI.defaultModel} model is available</li>
                                <li>Verify your internet connection</li>
                                <li>Try again in a few moments</li>
                            </ul>
                        </div>
                        <div class="error-actions">
                            <button class="retry-btn" onclick="aiManager.showDetailedUpgradePlan('${tech.technology}')">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                            <button class="close-btn" onclick="aiManager.closeModal(this)">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    displayUpgradePlan(modal, plan, tech) {
        const content = modal.querySelector('.modal-content');
        
        content.innerHTML = `
            <div class="modal-header">
                <h3>🚀 Upgrade Plan: ${this.escapeHtml(tech.technology)}</h3>
                <span class="close-modal" onclick="aiManager.closeModal(this)">&times;</span>
            </div>
            <div class="modal-body">
                <div class="upgrade-plan-container">
                    <div class="upgrade-summary">
                        <div class="upgrade-info">
                            <span class="current-version">Current: ${this.escapeHtml(tech.version || 'Unknown')}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span class="target-version">Target: ${this.escapeHtml(plan.targetVersion || 'Latest')}</span>
                        </div>
                        <div class="priority-badge priority-${plan.priority || 'medium'}">
                            ${(plan.priority || 'medium').toUpperCase()} Priority
                        </div>
                    </div>
                    
                    <div class="plan-overview">
                        <h4>📋 Recommendation</h4>
                        <p class="recommendation">${this.escapeHtml(plan.recommendation || 'No specific recommendation provided.')}</p>
                        
                        <div class="plan-meta">
                            <div class="meta-item">
                                <span class="meta-label">Timeline:</span>
                                <span class="meta-value">${this.escapeHtml(plan.timeline || 'Not specified')}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Effort Level:</span>
                                <span class="meta-value effort-${(plan.effort || 'medium')}">${(plan.effort || 'medium').toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="plan-section">
                        <h4>🔧 Upgrade Steps</h4>
                        <ol class="upgrade-steps">
                            ${(plan.steps || []).map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}
                        </ol>
                    </div>
                    
                    <div class="plan-section">
                        <h4>⚠️ Risks & Considerations</h4>
                        <ul class="risk-list">
                            ${(plan.risks || []).map(risk => `<li>${this.escapeHtml(risk)}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-section">
                        <h4>✅ Benefits</h4>
                        <ul class="benefits-list">
                            ${(plan.benefits || []).map(benefit => `<li>${this.escapeHtml(benefit)}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-section">
                        <h4>🧪 Testing Required</h4>
                        <ul class="testing-list">
                            ${(plan.testingRequired || []).map(test => `<li>${this.escapeHtml(test)}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-section">
                        <h4>🔄 Rollback Plan</h4>
                        <p class="rollback-plan">${this.escapeHtml(plan.rollbackPlan || 'Standard rollback procedures apply.')}</p>
                    </div>
                    
                    <div class="plan-section">
                        <h4>📦 Dependencies</h4>
                        <ul class="dependencies-list">
                            ${(plan.dependencies || []).map(dep => `<li>${this.escapeHtml(dep)}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-actions">
                        <button class="btn-primary" onclick="aiManager.exportUpgradePlan('${tech.technology}', ${JSON.stringify(plan).replace(/'/g, '&apos;')})">
                            <i class="fas fa-download"></i> Export Plan
                        </button>
                        <button class="btn-secondary" onclick="aiManager.closeModal(this)">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    exportUpgradePlan(techName, plan) {
        const exportData = {
            technology: techName,
            exportDate: new Date().toISOString(),
            plan: plan
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${techName}-upgrade-plan-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage(`Upgrade plan for ${techName} exported successfully`, 'success');
    }

    displayNoAIUpgradePlan(modal, tech) {
        const content = modal.querySelector('.modal-content');
        content.innerHTML = `
            <div class="modal-header">
                <h3>🤖 AI Upgrade Plan: ${this.escapeHtml(tech.technology)}</h3>
                <span class="close-modal" onclick="aiManager.closeModal(this)">&times;</span>
            </div>
            <div class="modal-body">
                <div class="ai-unavailable">
                    <div class="ai-status">
                        <i class="fas fa-robot"></i>
                        <h4>AI Analysis Unavailable</h4>
                        <p>Ollama AI is not running or not configured. Please:</p>
                    </div>
                    
                    <div class="setup-instructions">
                        <h5>🔧 Setup Instructions:</h5>
                        <ol>
                            <li>Install Ollama from <a href="https://ollama.ai" target="_blank">ollama.ai</a></li>
                            <li>Run: <code>ollama pull llama3.2:3b</code></li>
                            <li>Start Ollama service</li>
                            <li>Refresh this page and try again</li>
                        </ol>
                    </div>
                    
                    <div class="basic-guidance">
                        <h5>📋 Basic Upgrade Guidance for ${this.escapeHtml(tech.technology)}:</h5>
                        <div class="guidance-content">
                            <p><strong>Current:</strong> ${this.escapeHtml(tech.version || 'Unknown')}</p>
                            <p><strong>Latest:</strong> ${this.escapeHtml(tech.latestVersion || 'Check official website')}</p>
                            
                            <div class="general-steps">
                                <h6>General Steps:</h6>
                                <ul>
                                    <li>Review release notes and breaking changes</li>
                                    <li>Update dependencies and check compatibility</li>
                                    <li>Test thoroughly in staging environment</li>
                                    <li>Plan rollback strategy</li>
                                    <li>Schedule upgrade during maintenance window</li>
                                    <li>Monitor system after upgrade</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="error-actions">
                        <button class="retry-btn" onclick="location.reload()">
                            <i class="fas fa-redo"></i> Retry with AI
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    getCommonGitHubRepos(techName) {
        const repoMap = {
            'react': ['facebook/react'],
            'vue': ['vuejs/vue', 'vuejs/core'],
            'angular': ['angular/angular'],
            'svelte': ['sveltejs/svelte'],
            'nextjs': ['vercel/next.js'],
            'next.js': ['vercel/next.js'],
            'nuxt': ['nuxt/nuxt'],
            'express': ['expressjs/express'],
            'fastapi': ['tiangolo/fastapi'],
            'django': ['django/django'],
            'flask': ['pallets/flask'],
            'nodejs': ['nodejs/node'],
            'node.js': ['nodejs/node'],
            'typescript': ['microsoft/TypeScript'],
            'webpack': ['webpack/webpack'],
            'vite': ['vitejs/vite'],
            'docker': ['docker/cli', 'moby/moby'],
            'kubernetes': ['kubernetes/kubernetes'],
            'redis': ['redis/redis'],
            'nginx': ['nginx/nginx'],
            'postgresql': ['postgres/postgres'],
            'mongodb': ['mongodb/mongo'],
            'elasticsearch': ['elastic/elasticsearch']
        };
        
        return repoMap[techName] || [];
    }
    
    async fetchEOLFromAPIs(techName, currentVersion) {
        const normalizedName = techName.toLowerCase();
        
        // Map language, framework, and infrastructure variants to their EOL API names
        const eolApiMapping = {
            // Programming Languages
            'java': 'oracle-jdk',
            'jdk': 'oracle-jdk', 
            'openjdk': 'openjdk-builds-from-oracle',
            'oracle-jdk': 'oracle-jdk',
            'python': 'python',
            'node': 'nodejs',
            'nodejs': 'nodejs', 
            'node.js': 'nodejs',
            'go': 'go',
            'golang': 'go',
            'rust': 'rust',
            'php': 'php',
            'ruby': 'ruby',
            'dotnet': 'dotnet',
            '.net': 'dotnet',
            'csharp': 'dotnet',
            'c#': 'dotnet',
            // Frontend Frameworks
            'react': 'react',
            'vue': 'vue',
            'angular': 'angular',
            'nextjs': 'nextjs',
            'next.js': 'nextjs',
            'nuxt': 'nuxt',
            // Backend Frameworks
            'express': 'express',
            'django': 'django',
            'spring': 'spring-framework',
            'spring-boot': 'spring-boot',
            'rails': 'rails',
            'laravel': 'laravel',
            // Databases
            'postgresql': 'postgresql',
            'postgres': 'postgresql',
            'mysql': 'mysql',
            'mongodb': 'mongodb',
            'redis': 'redis',
            'elasticsearch': 'elasticsearch',
            // Container & Orchestration
            'docker': 'docker-engine',
            'kubernetes': 'kubernetes',
            'k8s': 'kubernetes',
            // AWS Services
            'eks': 'amazon-eks',
            'amazon-eks': 'amazon-eks',
            'aws-eks': 'amazon-eks',
            'rds': 'amazon-rds-postgresql',
            'amazon-rds-postgresql': 'amazon-rds-postgresql',
            'amazon-rds-mysql': 'amazon-rds-mysql', 
            'amazon-rds-mariadb': 'amazon-rds-mariadb',
            'aws-lambda': 'aws-lambda',
            'lambda': 'aws-lambda',
            // Azure Services
            'aks': 'azure-kubernetes-service',
            'azure-kubernetes-service': 'azure-kubernetes-service',
            'azure-devops-server': 'azure-devops-server',
            // Google Cloud Services
            'gke': 'google-kubernetes-engine',
            'google-kubernetes-engine': 'google-kubernetes-engine'
        };
        
        const apiName = eolApiMapping[normalizedName] || normalizedName;
        
        // Try endoflife.date API
        try {
            const url = `${this.apiEndpoints.endoflife}/${apiName}.json`;
            console.log('📅 [EOL DEBUG] API Request:', {
                url: url,
                techName: techName,
                apiName: apiName,
                currentVersion: currentVersion
            });

            const response = await fetch(url);
            console.log('📅 [EOL DEBUG] API Response Status:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('📅 [EOL DEBUG] API Response Data:', {
                    techName: techName,
                    dataLength: Array.isArray(data) ? data.length : 'not array',
                    firstFewItems: Array.isArray(data) ? data.slice(0, 3) : data
                });
                
                if (Array.isArray(data) && data.length > 0) {
                    // Try to find specific version
                    let versionData = null;
                    if (currentVersion) {
                        const majorVersion = this.extractMajorVersion(currentVersion);
                        console.log(`Looking for EOL data for ${techName} version ${currentVersion}, major: ${majorVersion}`);
                        
                        versionData = data.find(v => {
                            const match = v.cycle == majorVersion || 
                                         v.cycle == currentVersion ||
                                         (v.latest && v.latest.startsWith(majorVersion + '.'));
                            if (match) {
                                console.log(`Matched cycle ${v.cycle} for version ${currentVersion} (major: ${majorVersion})`);
                            }
                            return match;
                        });
                        
                        console.log(`Found version data:`, versionData);
                        console.log(`Available cycles:`, data.map(d => d.cycle));
                    }
                    
                    // Only fallback to latest if no specific version found AND no current version specified
                    const targetData = versionData || (!currentVersion ? data[0] : null);
                    
                    if (!targetData) {
                        console.warn(`No EOL data found for ${techName} version ${currentVersion || 'any'}`);
                        return null;
                    }
                    
                    // Find any field containing "support" with a date value
                    const getSupportDate = (data) => {
                        for (const [key, value] of Object.entries(data)) {
                            if (key.toLowerCase().includes('support') && 
                                value && 
                                typeof value === 'string' && 
                                value.match(/\d{4}-\d{2}-\d{2}|true|false/) && 
                                value !== 'true' && value !== 'false') {
                                return value;
                            }
                        }
                        return 'Not specified';
                    };
                    
                    const result = {
                        eol: targetData.eol || 'Not specified',
                        support: getSupportDate(targetData),
                        lts: targetData.lts || false,
                        cycle: targetData.cycle,
                        source: versionData ? 'api-specific' : 'api-latest'
                    };
                    
                    console.log(`EOL data for ${techName}:`, result);
                    
                    return result;
                }
            }
        } catch (error) {
            console.warn(`EOL API check failed for ${techName}:`, error);
        }
        
        return null;
    }
    
    async checkVulnerabilities(techName, version, detectedType) {
        try {
            console.log('🔒 [SECURITY DEBUG] Starting vulnerability check:', {
                techName: techName,
                version: version,
                detectedType: detectedType
            });

            // Handle runtime technologies with specialized vulnerability sources
            const runtimeTechnologies = [
                'java', 'jdk', 'openjdk', 'oracle-jdk',
                'python', 'node', 'nodejs', 'node.js',
                'go', 'golang', 'rust', 'php', 'ruby',
                'dotnet', '.net', 'csharp', 'c#'
            ];

            const normalizedTechName = techName.toLowerCase();
            if (runtimeTechnologies.includes(normalizedTechName)) {
                console.log('🔒 [SECURITY DEBUG] Checking runtime vulnerabilities for:', techName, version);
                return await this.checkRuntimeVulnerabilities(techName, version);
            }

            const ecosystemMap = {
                'npm-package': 'npm',
                'python-package': 'PyPI',
                'github-release': 'GitHub'
            };

            const ecosystem = ecosystemMap[detectedType] || this.detectEcosystem(techName);
            
            if (!ecosystem) {
                console.log('🔒 [SECURITY DEBUG] No ecosystem detected, skipping vulnerability check');
                return null;
            }

            const queryPayload = {
                package: {
                    name: techName,
                    ecosystem: ecosystem
                },
                version: version
            };

            console.log('🔒 [SECURITY DEBUG] OSV API Request:', {
                url: this.apiEndpoints.osv,
                payload: queryPayload
            });

            const response = await fetch(this.apiEndpoints.osv, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryPayload)
            });

            console.log('🔒 [SECURITY DEBUG] OSV API Response Status:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`OSV API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('🔒 [SECURITY DEBUG] OSV API Response Data:', {
                techName: techName,
                vulnerabilityCount: data.vulns?.length || 0,
                hasVulns: !!(data.vulns && data.vulns.length > 0)
            });

            if (!data.vulns || data.vulns.length === 0) {
                return {
                    vulnerabilities: [],
                    count: 0,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    securityScore: 100
                };
            }

            const processedVulns = this.processVulnerabilities(data.vulns);
            
            console.log('🔒 [SECURITY DEBUG] Processed Vulnerabilities:', {
                techName: techName,
                total: processedVulns.vulnerabilities.length,
                critical: processedVulns.critical,
                high: processedVulns.high,
                securityScore: processedVulns.securityScore
            });

            return processedVulns;

        } catch (error) {
            console.warn('🔒 [SECURITY DEBUG] Vulnerability check failed:', {
                techName: techName,
                error: error.message
            });
            return null;
        }
    }

    async checkRuntimeVulnerabilities(techName, version) {
        try {
            console.log('🔒 [SECURITY DEBUG] Checking runtime vulnerabilities:', techName, version);
            
            // For Node.js, use a combination of Node.js security advisories and CVE databases
            if (techName.toLowerCase().includes('node')) {
                return await this.checkNodeJSVulnerabilities(version);
            }
            
            // For Java, check Oracle/OpenJDK advisories
            if (techName.toLowerCase().includes('java') || techName.toLowerCase().includes('jdk')) {
                return await this.checkJavaVulnerabilities(version);
            }
            
            // For Python, check Python security advisories
            if (techName.toLowerCase().includes('python')) {
                return await this.checkPythonVulnerabilities(version);
            }
            
            // For other runtimes, use general CVE search
            return await this.checkGeneralCVEDatabase(techName, version);
            
        } catch (error) {
            console.warn('🔒 [SECURITY DEBUG] Runtime vulnerability check failed:', error.message);
            return {
                vulnerabilities: [],
                count: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                securityScore: 90,
                runtimeTechnology: true,
                note: 'Unable to check runtime vulnerabilities at this time'
            };
        }
    }

    async checkNodeJSVulnerabilities(version) {
        try {
            // Try to use Node.js Security Working Group API or GitHub Security API
            // For now, since we don't have access to these APIs, return clean state
            console.log('🔒 [SECURITY DEBUG] Node.js vulnerability APIs not implemented yet');
            
            return {
                vulnerabilities: [],
                count: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                securityScore: 95,
                runtimeTechnology: true,
                source: 'Node.js Security Working Group (API access needed)',
                note: 'Check nodejs.org/en/security for latest advisories'
            };
            
        } catch (error) {
            console.warn('🔒 [SECURITY DEBUG] Node.js vulnerability check failed:', error.message);
            return this.getDefaultRuntimeSecurityState();
        }
    }

    async checkJavaVulnerabilities(version) {
        try {
            // Would need to integrate with Oracle Security API or NVD API
            console.log('🔒 [SECURITY DEBUG] Java vulnerability APIs not implemented yet');
            
            return {
                vulnerabilities: [],
                count: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                securityScore: 95,
                runtimeTechnology: true,
                source: 'Oracle Critical Patch Updates (API access needed)',
                note: 'Check oracle.com/security-alerts for latest patches'
            };
            
        } catch (error) {
            console.warn('🔒 [SECURITY DEBUG] Java vulnerability check failed:', error.message);
            return this.getDefaultRuntimeSecurityState();
        }
    }

    async checkPythonVulnerabilities(version) {
        try {
            // Would need to integrate with Python Security Response API or NVD API
            console.log('🔒 [SECURITY DEBUG] Python vulnerability APIs not implemented yet');
            
            return {
                vulnerabilities: [],
                count: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                securityScore: 95,
                runtimeTechnology: true,
                source: 'Python Security Response Team (API access needed)',
                note: 'Check python.org/news/security for latest advisories'
            };
            
        } catch (error) {
            console.warn('🔒 [SECURITY DEBUG] Python vulnerability check failed:', error.message);
            return this.getDefaultRuntimeSecurityState();
        }
    }

    async checkGeneralCVEDatabase(techName, version) {
        try {
            // Would need to integrate with NVD API, CVE Details API, or similar
            console.log('🔒 [SECURITY DEBUG] General CVE APIs not implemented yet for:', techName);
            
            return {
                vulnerabilities: [],
                count: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                securityScore: 90,
                runtimeTechnology: true,
                source: 'NVD/CVE Database (API access needed)',
                note: `Check official ${techName} security advisories for vulnerabilities`
            };
            
        } catch (error) {
            console.warn('🔒 [SECURITY DEBUG] General CVE check failed:', error.message);
            return this.getDefaultRuntimeSecurityState();
        }
    }

    getDefaultRuntimeSecurityState() {
        return {
            vulnerabilities: [],
            count: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            securityScore: 90,
            runtimeTechnology: true,
            note: 'Runtime security status could not be determined'
        };
    }

    calculateSecurityScoreFromVulns(vulnerabilities) {
        let score = 100;
        for (const vuln of vulnerabilities) {
            switch (vuln.severity) {
                case 'critical':
                    score -= 25;
                    break;
                case 'high':
                    score -= 15;
                    break;
                case 'medium':
                    score -= 8;
                    break;
                case 'low':
                    score -= 3;
                    break;
            }
        }
        return Math.max(score, 10);
    }

    detectEcosystem(techName) {
        const ecosystemHints = {
            // Common npm packages
            'react': 'npm',
            'vue': 'npm', 
            'angular': 'npm',
            'express': 'npm',
            'lodash': 'npm',
            'axios': 'npm',
            'webpack': 'npm',
            'typescript': 'npm',
            'nextjs': 'npm',
            'next.js': 'npm',
            
            // Common Python packages
            'django': 'PyPI',
            'flask': 'PyPI',
            'requests': 'PyPI',
            'numpy': 'PyPI',
            'pandas': 'PyPI',
            'fastapi': 'PyPI',
            
            // Languages and runtimes (use GitHub for version info)
            'node': 'npm',
            'nodejs': 'npm',
            'python': 'PyPI'
        };
        
        return ecosystemHints[techName.toLowerCase()] || null;
    }

    processVulnerabilities(vulns) {
        let critical = 0, high = 0, medium = 0, low = 0;
        const processedVulns = [];

        vulns.forEach(vuln => {
            const severity = this.extractSeverity(vuln);
            const processedVuln = {
                id: vuln.id,
                summary: vuln.summary || 'No summary available',
                severity: severity,
                published: vuln.published,
                modified: vuln.modified,
                references: vuln.references || [],
                aliases: vuln.aliases || [],
                details: vuln.details || vuln.summary || 'No details available'
            };

            processedVulns.push(processedVuln);

            switch (severity.toLowerCase()) {
                case 'critical': critical++; break;
                case 'high': high++; break;
                case 'medium': medium++; break;
                case 'low': low++; break;
            }
        });

        // Calculate security score (100 - penalty based on severity)
        const securityScore = Math.max(0, 100 - (critical * 25) - (high * 15) - (medium * 5) - (low * 1));

        return {
            vulnerabilities: processedVulns,
            count: vulns.length,
            critical,
            high,
            medium,
            low,
            securityScore
        };
    }

    extractSeverity(vuln) {
        // Try different places where severity might be stored
        if (vuln.database_specific?.severity) {
            return vuln.database_specific.severity;
        }
        
        if (vuln.severity && Array.isArray(vuln.severity)) {
            const cvssV3 = vuln.severity.find(s => s.type === 'CVSS_V3');
            if (cvssV3?.score) {
                return this.cvssToSeverity(cvssV3.score);
            }
        }
        
        // Look for CVE references to infer severity
        if (vuln.aliases?.some(alias => alias.startsWith('CVE-'))) {
            return 'medium'; // Default for CVEs
        }
        
        return 'unknown';
    }

    cvssToSeverity(score) {
        if (score >= 9.0) return 'critical';
        if (score >= 7.0) return 'high';
        if (score >= 4.0) return 'medium';
        return 'low';
    }

    extractMajorVersion(version) {
        if (!version) return null;
        
        // Handle different version formats
        const cleaned = version.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        
        // For versions like "3.11" return "11", for "21.0.5" return "21"
        if (parts.length >= 2 && parts[0] === '3' && parseInt(parts[1]) > 7) {
            // Python case: 3.11 -> "11"
            return parts[1];
        }
        
        // Standard case: return first part
        return parts[0];
    }

    // Local AI Integration Methods
    async initializeLocalAI() {
        try {
            const response = await fetch(`${this.localAI.ollamaURL}/api/tags`, {
                signal: AbortSignal.timeout(2000)
            });
            
            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];
                this.localAI.available = models.some(model => 
                    model.name.includes('llama') || model.name.includes('mistral')
                );
                
                if (this.localAI.available && !this.localAI.enabled) {
                    this.showLocalAIPrompt();
                } else if (this.localAI.available && this.localAI.enabled) {
                    this.showAIStatus('🤖 Local AI Ready (Ollama)');
                }
            }
        } catch (error) {
            this.localAI.available = false;
            if (this.localAI.enabled) {
                this.showAIStatus('⚠️ Ollama not running - using rule-based analysis');
            }
        }
    }

    showLocalAIPrompt() {
        const notification = document.createElement('div');
        notification.className = 'ai-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">🤖</div>
                <div class="notification-text">
                    <h4>Local AI Available!</h4>
                    <p>Ollama detected. Enable local AI for enhanced analysis?</p>
                </div>
                <div class="notification-actions">
                    <button onclick="aiManager.enableLocalAI()" class="btn-primary btn-sm">
                        Enable AI
                    </button>
                    <button onclick="this.parentElement.parentElement.remove()" class="btn-secondary btn-sm">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds if no action
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    enableLocalAI() {
        this.localAI.enabled = true;
        localStorage.setItem('localAI_enabled', 'true');
        this.showAIStatus('🤖 Local AI Enabled!');
        
        // Remove any existing notifications
        document.querySelectorAll('.ai-notification').forEach(el => el.remove());
        
        // Re-analyze existing technologies with AI
        if (this.techData.length > 0) {
            this.showConfirmAIReanalysis();
        }
    }

    showConfirmAIReanalysis() {
        if (confirm('Re-analyze existing technologies with local AI? This will provide enhanced insights.')) {
            this.aiAnalyzeAll();
        }
    }

    async performOllamaAnalysis(techData, knownTech) {
        try {
            const prompt = this.buildOllamaPrompt(techData, knownTech);
            
            const response = await fetch(`${this.localAI.ollamaURL}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.localAI.defaultModel,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.3,
                        num_ctx: 4096
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseOllamaResponse(data.response, techData, knownTech);

        } catch (error) {
            console.warn('Ollama analysis failed:', error);
            this.localAI.available = false;
            throw error;
        }
    }

    buildOllamaPrompt(techData, knownTech) {
        const versionContext = this.buildVersionContext(techData);
        
        return `You are a DevOps expert analyzing a technology stack component. Provide specific, actionable analysis.

TECHNOLOGY: ${techData.technology}
CURRENT VERSION: ${techData.currentVersion}
LATEST VERSION: ${techData.latestVersion || 'Unknown'}
CATEGORY: ${knownTech?.category || 'Unknown'}
EOL DATE: ${techData.eolDate || 'Unknown'}
ENVIRONMENT: ${techData.environment || 'Not specified'}

${versionContext}

Analyze this technology and respond with JSON in this exact format:
{
  "priority": "critical|high|medium|low",
  "summary": "One sentence summary of the current state",
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2", 
    "Specific recommendation 3"
  ],
  "risks": [
    "Security or compatibility risk",
    "Performance or maintenance risk"
  ],
  "nextSteps": [
    "Immediate action to take",
    "Planning step",
    "Implementation milestone"
  ],
  "urgency": "Timeframe for action (e.g., '2-4 weeks', 'next quarter')",
  "complexity": "low|medium|high"
}

CRITICAL RULES:
- NEVER INVENT VERSION NUMBERS: Only use versions explicitly listed above
- CURRENT VERSION: ${techData.currentVersion} - LATEST VERSION: ${techData.latestVersion || 'Unknown'}
- If suggesting upgrades, use ONLY the LATEST VERSION number provided
- If LATEST VERSION is "Unknown", use phrases like "latest stable version" NOT specific numbers
- FORBIDDEN: Do not suggest version 27, 25+, 26+, or any version not explicitly provided
- FORBIDDEN: Do not suggest version numbers higher than what is provided
- ONLY recommend upgrades to NEWER versions, never suggest downgrading to older versions
- Understand version chronology and semantic versioning (higher numbers are typically newer)
- When suggesting version changes, ensure they represent actual improvements (security, features, performance)
- If downgrading is absolutely necessary due to compatibility issues, clearly explain why
- SECURITY PRIORITY: If there are Critical vulnerabilities, set priority to "critical" and urgency to immediate
- SECURITY PRIORITY: If there are High vulnerabilities, set priority to "high" and address urgently
- Factor security vulnerabilities heavily into risk assessment and upgrade urgency

Focus on:
- Security implications of the current version
- Performance benefits of upgrading to newer (not older) versions
- Compatibility concerns with modern libraries
- Enterprise/production considerations
- Specific migration steps that make logical sense

Be concise but specific about versions and provide actionable steps.`;
    }

    buildVersionContext(techData) {
        const currentVersion = techData.currentVersion;
        const latestVersion = techData.latestVersion;
        
        let context = `CONTEXT: Currently running ${techData.technology} version ${currentVersion}.`;
        
        if (latestVersion && latestVersion !== 'Unknown') {
            context += ` Latest available version is ${latestVersion}.`;
            context += ` CONSTRAINT: You must ONLY recommend upgrading to version ${latestVersion}. Do not suggest any other version numbers.`;
        } else {
            context += ` Latest version is unknown - CONSTRAINT: You must NOT suggest any specific version numbers.`;
        }
        
        context += ` Always recommend upgrading to newer versions for better security, performance, and features. Never suggest downgrading to older versions unless there are critical compatibility issues that cannot be resolved otherwise.`;
        
        return context;
    }

    buildVulnerabilityContext(techData) {
        if (!techData.vulnerabilities || techData.vulnerabilities.length === 0) {
            return 'SECURITY STATUS: No known vulnerabilities detected for this version.';
        }

        const criticalCount = techData.criticalVulns || 0;
        const highCount = techData.highVulns || 0;
        const totalCount = techData.vulnerabilityCount || 0;
        const securityScore = techData.securityScore || 'Unknown';

        let context = `SECURITY STATUS: ${totalCount} vulnerabilities found in this version (Security Score: ${securityScore}/100).`;
        
        if (criticalCount > 0) {
            context += ` CRITICAL: ${criticalCount} critical vulnerabilities require IMMEDIATE attention.`;
        }
        
        if (highCount > 0) {
            context += ` HIGH PRIORITY: ${highCount} high-severity vulnerabilities should be addressed urgently.`;
        }

        // Add specific vulnerability IDs for context
        const criticalVulns = techData.vulnerabilities.filter(v => v.severity === 'critical');
        const highVulns = techData.vulnerabilities.filter(v => v.severity === 'high');
        
        if (criticalVulns.length > 0) {
            context += ` Critical vulnerabilities: ${criticalVulns.map(v => v.id).join(', ')}.`;
        }
        
        if (highVulns.length > 0 && criticalVulns.length === 0) {
            context += ` High vulnerabilities: ${highVulns.slice(0, 3).map(v => v.id).join(', ')}${highVulns.length > 3 ? ' and others' : ''}.`;
        }

        return context;
    }

    buildVulnerabilityContext(techData) {
        if (!techData.vulnerabilities || techData.vulnerabilities.length === 0) {
            return 'SECURITY STATUS: No known vulnerabilities detected for this version.';
        }

        const criticalCount = techData.criticalVulns || 0;
        const highCount = techData.highVulns || 0;
        const totalCount = techData.vulnerabilityCount || 0;
        const securityScore = techData.securityScore || 'Unknown';

        let context = `SECURITY STATUS: ${totalCount} vulnerabilities found in this version (Security Score: ${securityScore}/100).`;
        
        if (criticalCount > 0) {
            context += ` CRITICAL: ${criticalCount} critical vulnerabilities require IMMEDIATE attention.`;
        }
        
        if (highCount > 0) {
            context += ` HIGH PRIORITY: ${highCount} high-severity vulnerabilities should be addressed urgently.`;
        }

        // Add specific vulnerability IDs for context
        const criticalVulns = techData.vulnerabilities.filter(v => v.severity === 'critical');
        const highVulns = techData.vulnerabilities.filter(v => v.severity === 'high');
        
        if (criticalVulns.length > 0) {
            context += ` Critical vulnerabilities: ${criticalVulns.map(v => v.id).join(', ')}.`;
        }
        
        if (highVulns.length > 0 && criticalVulns.length === 0) {
            context += ` High vulnerabilities: ${highVulns.slice(0, 3).map(v => v.id).join(', ')}${highVulns.length > 3 ? ' and others' : ''}.`;
        }

        return context;
    }

    parseOllamaResponse(response, techData, knownTech) {
        try {
            // Extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            // Version validation - check for invalid version suggestions
            const responseText = JSON.stringify(parsed);
            const currentVersion = techData.currentVersion || '';
            const latestVersion = techData.latestVersion || '';
            
            // Look for version numbers that aren't in our provided data
            const versionPattern = /version\s+(\d+(?:\.\d+)*(?:\+)?)/gi;
            const suggestedVersions = [];
            let match;
            while ((match = versionPattern.exec(responseText)) !== null) {
                suggestedVersions.push(match[1]);
            }
            
            // Validate suggested versions
            for (const version of suggestedVersions) {
                if (version !== currentVersion && 
                    version !== latestVersion && 
                    !currentVersion.includes(version) && 
                    !latestVersion.includes(version)) {
                    console.warn(`🚨 VERSION VALIDATION: AI suggested invalid version ${version} for ${techData.technology}. Current: ${currentVersion}, Latest: ${latestVersion}`);
                }
            }
            
            // Determine final priority based on vulnerabilities and AI analysis
            const aiPriority = parsed.priority || 'medium';
            const finalPriority = this.determineOverallPriority(aiPriority, techData);
            
            return {
                aiPriority: finalPriority,
                aiSummary: parsed.summary || '',
                recommendations: parsed.recommendations || [],
                nextSteps: parsed.nextSteps || [],
                aiRisks: parsed.risks || [],
                aiUrgency: parsed.urgency || '',
                upgradeComplexity: parsed.complexity || 'medium',
                enhancedByAI: true,
                aiProvider: 'ollama-local',
                analysisDate: new Date().toISOString(),
                // Include original analysis data
                securityScore: this.calculateSecurityScore(techData, parsed),
                stabilityScore: this.calculateStabilityScore(techData, parsed),
                estimatedEffort: parsed.complexity || 'medium'
            };

        } catch (error) {
            console.warn('Failed to parse Ollama response:', error);
            
            // Fallback: return enhanced rule-based analysis with complete AI summary
            const ruleBasedAnalysis = this.performRuleBasedAnalysis(techData, knownTech);
            return {
                ...ruleBasedAnalysis,
                aiSummary: response.replace(/```json|```|\{[\s\S]*\}/, '').trim() || 'AI analysis completed for this technology component.',
                enhancedByAI: true,
                aiProvider: 'ollama-local-fallback'
            };
        }
    }

    // Override priority based on vulnerability severity
    determineOverallPriority(aiPriority, techData) {
        // Vulnerability-based priority override
        if (techData.criticalVulns && techData.criticalVulns > 0) {
            console.log('🚨 [PRIORITY OVERRIDE] Critical vulnerabilities detected - setting priority to CRITICAL');
            return 'critical';
        }
        
        if (techData.highVulns && techData.highVulns > 0) {
            // High vulnerabilities elevate to high priority unless already critical
            const newPriority = ['critical', 'high'].includes(aiPriority) ? aiPriority : 'high';
            console.log('⚠️ [PRIORITY OVERRIDE] High vulnerabilities detected - elevating priority to:', newPriority);
            return newPriority;
        }
        
        // EOL soon also elevates priority
        if (techData.eolDate && this.isEOLSoon(techData.eolDate)) {
            const priorities = ['low', 'medium', 'high', 'critical'];
            const currentIndex = priorities.indexOf(aiPriority);
            const elevatedIndex = Math.min(currentIndex + 1, priorities.length - 1);
            console.log('📅 [PRIORITY OVERRIDE] EOL approaching - elevating priority from', aiPriority, 'to', priorities[elevatedIndex]);
            return priorities[elevatedIndex];
        }
        
        return aiPriority;
    }

    calculateSecurityScore(techData, aiAnalysis) {
        let score = 85; // Base score
        
        // Factor in vulnerability data first (most important)
        if (techData.vulnerabilities && techData.vulnerabilities.length > 0) {
            const criticalVulns = techData.criticalVulns || 0;
            const highVulns = techData.highVulns || 0;
            const mediumVulns = techData.vulnerabilities.filter(v => v.severity === 'medium').length;
            const lowVulns = techData.vulnerabilities.filter(v => v.severity === 'low').length;
            
            // Severe penalties for actual vulnerabilities
            score -= (criticalVulns * 30);  // Critical vulns are very serious
            score -= (highVulns * 20);      // High vulns are serious
            score -= (mediumVulns * 10);    // Medium vulns are concerning
            score -= (lowVulns * 3);        // Low vulns are minor issues
            
            console.log('🔒 [SECURITY CALC] Vulnerability impact:', {
                technology: techData.technology,
                baseScore: 85,
                criticalVulns,
                highVulns,
                scoreAfterVulns: score
            });
        }
        
        // Factor in AI analysis priority (less weight than actual vulnerabilities)
        if (aiAnalysis.priority === 'critical') score -= 15;
        else if (aiAnalysis.priority === 'high') score -= 10;
        else if (aiAnalysis.priority === 'medium') score -= 5;
        
        // Factor in EOL status
        if (techData.eolDate && this.isEOLSoon(techData.eolDate)) {
            score -= 20;
        }
        
        return Math.max(score, 0);
    }

    calculateStabilityScore(techData, aiAnalysis) {
        let score = 90; // Base score
        
        if (aiAnalysis.complexity === 'high') score -= 15;
        else if (aiAnalysis.complexity === 'medium') score -= 5;
        
        return Math.max(score, 30);
    }

    isEOLSoon(eolDate) {
        if (!eolDate || eolDate.includes('Not specified') || eolDate.includes('ongoing')) {
            return false;
        }
        
        try {
            const eolTimestamp = new Date(eolDate).getTime();
            const now = Date.now();
            const sixMonthsFromNow = now + (6 * 30 * 24 * 60 * 60 * 1000);
            
            return eolTimestamp < sixMonthsFromNow;
        } catch (error) {
            return false;
        }
    }

    showAIStatus(message) {
        // Create or update AI status indicator
        let statusEl = document.getElementById('ai-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'ai-status';
            statusEl.className = 'ai-status-indicator';
            
            const headerActions = document.querySelector('.header-actions');
            headerActions.appendChild(statusEl);
        }
        
        statusEl.innerHTML = `
            <span class="ai-status-text">${message}</span>
            <button class="ai-config-btn" onclick="aiManager.showAIConfig()" title="AI Configuration">
                <i class="fas fa-cog"></i>
            </button>
        `;
        
        // Auto-hide success messages after 5 seconds
        if (message.includes('Ready') || message.includes('Enabled')) {
            setTimeout(() => {
                statusEl.querySelector('.ai-status-text').style.opacity = '0.7';
            }, 5000);
        }
    }

    showAIConfig() {
        const modal = document.createElement('div');
        modal.className = 'modal ai-config-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-brain"></i> Local AI Configuration</h2>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="ai-status-section">
                        <h3>Current Status</h3>
                        <div class="status-grid">
                            <div class="status-item">
                                <span class="status-label">Ollama:</span>
                                <span class="status-value ${this.localAI.available ? 'status-good' : 'status-error'}">
                                    ${this.localAI.available ? '✅ Available' : '❌ Not Available'}
                                </span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Local AI:</span>
                                <span class="status-value ${this.localAI.enabled ? 'status-good' : 'status-neutral'}">
                                    ${this.localAI.enabled ? '✅ Enabled' : '⚪ Disabled'}
                                </span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Model:</span>
                                <span class="status-value">${this.localAI.defaultModel}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${!this.localAI.available ? `
                        <div class="setup-instructions">
                            <h3>Setup Ollama</h3>
                            <div class="setup-steps">
                                <div class="step">
                                    <div class="step-number">1</div>
                                    <div class="step-content">
                                        <h4>Download Ollama</h4>
                                        <p>Download from <a href="https://ollama.ai/download" target="_blank">ollama.ai</a></p>
                                    </div>
                                </div>
                                <div class="step">
                                    <div class="step-number">2</div>
                                    <div class="step-content">
                                        <h4>Install a Model</h4>
                                        <p>Run in terminal: <code>ollama run llama3.2:3b</code></p>
                                        <small>(Downloads ~2GB model, one-time setup)</small>
                                    </div>
                                </div>
                                <div class="step">
                                    <div class="step-number">3</div>
                                    <div class="step-content">
                                        <h4>Refresh</h4>
                                        <button onclick="location.reload()" class="btn-primary btn-sm">
                                            <i class="fas fa-sync"></i> Refresh Page
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="ai-controls">
                        <h3>Controls</h3>
                        <div class="control-group">
                            <label class="toggle-switch">
                                <input type="checkbox" ${this.localAI.enabled ? 'checked' : ''} 
                                       onchange="aiManager.toggleLocalAI(this.checked)">
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">Enable Local AI Analysis</span>
                            </label>
                        </div>
                        
                        ${this.localAI.enabled && this.techData.length > 0 ? `
                            <button onclick="aiManager.reanalyzeWithAI()" class="btn-secondary full-width">
                                <i class="fas fa-sync"></i> Re-analyze All Technologies with AI
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="ai-benefits">
                        <h3>Local AI Benefits</h3>
                        <ul>
                            <li>🔒 <strong>Complete Privacy:</strong> Analysis never leaves your computer</li>
                            <li>⚡ <strong>Fast Analysis:</strong> 1-3 second response times</li>
                            <li>🎯 <strong>Context-Aware:</strong> Understands your specific technology stack</li>
                            <li>💡 <strong>Smart Insights:</strong> Enterprise-focused recommendations</li>
                            <li>🔄 <strong>Always Available:</strong> Works offline, no API limits</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    toggleLocalAI(enabled) {
        this.localAI.enabled = enabled;
        localStorage.setItem('localAI_enabled', enabled.toString());
        
        if (enabled && this.localAI.available) {
            this.showAIStatus('🤖 Local AI Enabled');
        } else if (enabled && !this.localAI.available) {
            this.showAIStatus('⚠️ Please install Ollama first');
        } else {
            this.showAIStatus('📊 Using rule-based analysis');
        }
    }

    async reanalyzeWithAI() {
        if (confirm(`Re-analyze ${this.techData.length} technologies with local AI?`)) {
            await this.aiAnalyzeAll();
        }
    }

    async performAIAnalysis(techData) {
        // Try local AI first if available
        if (this.localAI.enabled && this.localAI.available) {
            try {
                return await this.performOllamaAnalysis(techData);
            } catch (error) {
                console.warn('Local AI failed, using rule-based analysis:', error);
                this.showAIStatus('⚠️ Local AI error - using rule-based analysis');
            }
        }
        
        // Fallback to rule-based analysis
        return this.performRuleBasedAnalysis(techData);
    }

    analyzeVersions(current, latest) {
        if (!current || !latest) {
            return { gap: 'unknown', priority: 'medium' };
        }

        try {
            const currentParts = current.replace(/^v/, '').split('.').map(Number);
            const latestParts = latest.replace(/^v/, '').split('.').map(Number);

            const majorDiff = (latestParts[0] || 0) - (currentParts[0] || 0);
            const minorDiff = (latestParts[1] || 0) - (currentParts[1] || 0);
            const patchDiff = (latestParts[2] || 0) - (currentParts[2] || 0);

            if (majorDiff > 0) {
                return { 
                    gap: `${majorDiff} major version${majorDiff > 1 ? 's' : ''} behind`,
                    priority: majorDiff >= 5 ? 'high' : 'medium'  // Reduced from critical/high to high/medium
                };
            } else if (minorDiff > 0) {
                return { 
                    gap: `${minorDiff} minor version${minorDiff > 1 ? 's' : ''} behind`,
                    priority: minorDiff >= 10 ? 'high' : 'medium'  // Increased threshold
                };
            } else if (patchDiff > 0) {
                return { 
                    gap: `${patchDiff} patch version${patchDiff > 1 ? 's' : ''} behind`,
                    priority: 'low'
                };
            } else {
                return { gap: 'up-to-date', priority: 'low' };
            }
        } catch (error) {
            return { gap: 'comparison-failed', priority: 'medium' };
        }
    }

    analyzeEOL(eolDate, supportDate) {
        // Analyze both support and EOL dates for comprehensive lifecycle assessment
        const supportAnalysis = this.analyzeSupportDate(supportDate);
        const eolAnalysis = this.analyzeEOLDate(eolDate);
        
        // Return the higher priority of the two
        const priorities = ['low', 'medium', 'high', 'critical'];
        const supportPriority = priorities.indexOf(supportAnalysis.priority);
        const eolPriority = priorities.indexOf(eolAnalysis.priority);
        
        const finalPriority = priorities[Math.max(supportPriority, eolPriority)];
        
        // Combine recommendations
        const recommendations = [
            ...supportAnalysis.recommendations,
            ...eolAnalysis.recommendations
        ];
        
        return {
            priority: finalPriority,
            recommendations: recommendations
        };
    }
    
    analyzeSupportDate(supportDate) {
        if (!supportDate || supportDate === 'Not specified' || supportDate.toLowerCase().includes('not specified')) {
            return {
                priority: 'low',
                recommendations: []
            };
        }
        
        const today = new Date();
        const supportDateObj = this.parseDate(supportDate);
        
        if (supportDateObj && !isNaN(supportDateObj.getTime())) {
            const daysUntilEndOfSupport = Math.ceil((supportDateObj - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntilEndOfSupport < 0) {
                return {
                    priority: 'critical',  // Support already ended = critical
                    recommendations: ['🛠️ Regular support has ended - only security patches available']
                };
            } else if (daysUntilEndOfSupport < 365) {  // 1 year = high
                return {
                    priority: 'high',
                    recommendations: [`⏰ Regular support ends in ${Math.ceil(daysUntilEndOfSupport / 30)} months - start planning migration`]
                };
            } else if (daysUntilEndOfSupport < 1095) {  // 3 years = medium (2028 from 2026)
                return {
                    priority: 'medium',
                    recommendations: [`📅 Regular support ends in ${Math.ceil(daysUntilEndOfSupport / 365)} years - begin upgrade planning`]
                };
            } else {
                return {
                    priority: 'low',
                    recommendations: [`✅ Regular support continues for ${Math.ceil(daysUntilEndOfSupport / 365)} year(s)`]
                };
            }
        }
        
        return {
            priority: 'low',
            recommendations: []
        };
    }
    
    analyzeEOLDate(eolDate) {
        if (!eolDate || eolDate.toLowerCase().includes('not specified') || eolDate.toLowerCase().includes('active')) {
            return {
                priority: 'low',
                recommendations: ['✅ No immediate EOL concerns - continue monitoring']
            };
        }

        // Handle rolling releases
        if (eolDate.toLowerCase().includes('rolling') || eolDate.toLowerCase().includes('ongoing')) {
            return {
                priority: 'low',
                recommendations: ['🔄 Rolling release - stay updated with latest versions']
            };
        }

        // Handle multiple version EOL info (like Node.js)
        if (eolDate.includes(',') || eolDate.toLowerCase().includes('node')) {
            return {
                priority: 'medium',
                recommendations: ['📅 Multiple version lifecycles - check your specific version EOL']
            };
        }

        // Handle LTS patterns
        if (eolDate.toLowerCase().includes('lts') || eolDate.toLowerCase().includes('months')) {
            return {
                priority: 'medium',
                recommendations: ['📊 LTS/Support lifecycle - plan upgrades within support windows']
            };
        }

        // Try to parse actual dates
        const today = new Date();
        let eolDateObj = null;

        // Handle various date formats
        if (eolDate.match(/\d{4}-\d{2}/)) {
            // Format: 2029-10
            eolDateObj = new Date(eolDate + '-01');
        } else if (eolDate.match(/\d{4}/)) {
            // Format: 2029
            eolDateObj = new Date(eolDate + '-01-01');
        } else if (eolDate.includes('2026') || eolDate.includes('2027') || eolDate.includes('2028') || eolDate.includes('2029') || eolDate.includes('2030') || eolDate.includes('2031')) {
            // Extract year from text
            const yearMatch = eolDate.match(/(\d{4})/);
            if (yearMatch) {
                eolDateObj = new Date(yearMatch[1] + '-01-01');
            }
        }

        if (eolDateObj && !isNaN(eolDateObj.getTime())) {
            const daysUntilEOL = Math.ceil((eolDateObj - today) / (1000 * 60 * 60 * 24));

            if (daysUntilEOL < 0) {
                return {
                    priority: 'critical',
                    recommendations: ['⚠️ This version is already end-of-life and no longer receives security updates']
                };
            } else if (daysUntilEOL < 90) {
                return {
                    priority: 'critical',
                    recommendations: [`🚨 End-of-life in ${daysUntilEOL} days - immediate upgrade required`]
                };
            } else if (daysUntilEOL < 365) {
                return {
                    priority: 'high',
                    recommendations: [`⏰ End-of-life in ${Math.ceil(daysUntilEOL / 30)} months - plan upgrade soon`]
                };
            } else {
                const years = Math.ceil(daysUntilEOL / 365);
                return {
                    priority: 'low',
                    recommendations: [`✅ End-of-life in ${years} year${years > 1 ? 's' : ''} - good long-term support`]
                };
            }
        }

        // Default for unrecognized formats
        return {
            priority: 'medium',
            recommendations: [`📋 EOL Information: ${eolDate} - review specific dates for your version`]
        };
    }
    
    parseDate(dateString) {
        if (!dateString) return null;
        
        let dateObj = null;
        
        // Handle various date formats
        if (dateString.match(/\d{4}-\d{2}-\d{2}/)) {
            // Format: 2029-10-15
            dateObj = new Date(dateString);
        } else if (dateString.match(/\d{4}-\d{2}/)) {
            // Format: 2029-10
            dateObj = new Date(dateString + '-01');
        } else if (dateString.match(/\d{4}/)) {
            // Format: 2029
            dateObj = new Date(dateString + '-01-01');
        } else if (dateString.includes('2026') || dateString.includes('2027') || dateString.includes('2028') || dateString.includes('2029') || dateString.includes('2030') || dateString.includes('2031')) {
            // Extract year from text
            const yearMatch = dateString.match(/(\d{4})/);
            if (yearMatch) {
                dateObj = new Date(yearMatch[1] + '-01-01');
            }
        }
        
        return dateObj;
    }

    generateNextSteps(techData, analysis) {
        const steps = [];
        const priority = analysis.aiPriority;

        if (priority === 'critical') {
            steps.push(
                '🚨 IMMEDIATE: Schedule upgrade within 1-2 weeks',
                '📋 Create detailed upgrade plan',
                '🧪 Set up testing environment',
                '👥 Assign dedicated team members'
            );
        } else if (priority === 'high') {
            steps.push(
                '📅 Schedule upgrade within next quarter',
                '📖 Review migration documentation',
                '🧪 Begin compatibility testing',
                '💬 Communicate timeline to stakeholders'
            );
        } else if (priority === 'medium') {
            steps.push(
                '📆 Include in next major release cycle',
                '👀 Monitor for security advisories',
                '📚 Stay updated with release notes',
                '🔍 Evaluate new features and benefits'
            );
        } else {
            steps.push(
                '✅ Continue monitoring for updates',
                '📈 Track performance metrics',
                '🔔 Set up automated update notifications'
            );
        }

        return steps;
    }

    async aiAnalyzeAll() {
        const filteredData = this.getFilteredTechData();
        
        // Debug: Log the current filter and data
        console.log('Current product filter:', this.currentProductFilter);
        console.log('Filtered data count:', filteredData.length);
        console.log('Total data count:', this.techData.length);
        console.log('Filtered products:', [...new Set(filteredData.map(t => t.product))]);
        
        if (filteredData.length === 0) {
            const productName = this.currentProductFilter || 'the selected product';
            this.showError(`No technologies to analyze for ${productName}. Add some technologies first.`);
            return;
        }

        // Update button state
        const aiAnalyzeBtn = document.getElementById('aiAnalyzeAll');
        const originalText = aiAnalyzeBtn.innerHTML;
        aiAnalyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI Analyzing...';
        aiAnalyzeBtn.disabled = true;

        try {
            // Analyze each technology in the current product filter
            for (let i = 0; i < filteredData.length; i++) {
                const tech = filteredData[i];
                console.log(`Analyzing tech ${i + 1}/${filteredData.length}: ${tech.technology} (Product: ${tech.product})`);
                aiAnalyzeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analyzing ${i + 1}/${filteredData.length}...`;
                
                const updated = await this.aiAnalyzeTechnology(
                    tech.technology, 
                    tech.currentVersion, 
                    tech.product
                );
                
                // Preserve the original tech object and merge updates
                const techIndex = this.techData.findIndex(t => t.id === tech.id);
                if (techIndex !== -1) {
                    // Preserve all existing properties and merge with updates
                    this.techData[techIndex] = {
                        ...this.techData[techIndex], // Preserve original data
                        ...updated,                   // Apply updates
                        id: tech.id                   // Ensure ID is preserved
                    };
                }
                
                await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
            }
            this.saveData();
            this.renderStats();
            this.renderTechCards();
            
            // Now perform overall stack analysis with Ollama if available
            if (this.localAI.enabled && this.localAI.available) {
                aiAnalyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Stack Insights...';
                await this.performOllamaOverallAnalysis();
            } else {
                // Fallback to rule-based overall recommendations
                this.generateOverallRecommendations();
            }
            
        } catch (error) {
            this.showError(`AI analysis failed: ${error.message}`);
        } finally {
            // Restore button state
            aiAnalyzeBtn.innerHTML = originalText;
            aiAnalyzeBtn.disabled = false;
        }
    }
    
    async performOllamaOverallAnalysis() {
        const stackSummary = this.buildStackSummary();
        const prompt = this.buildOverallAnalysisPrompt(stackSummary);
        
        try {
            const requestPayload = {
                model: this.localAI.defaultModel,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    top_p: 0.9
                }
            };

            console.log('🤖 [AI DEBUG] Ollama Overall Analysis Request:', {
                url: `${this.localAI.ollamaURL}/api/generate`,
                method: 'POST',
                stackSize: stackSummary.length,
                model: this.localAI.defaultModel,
                promptLength: prompt.length
            });

            const response = await fetch(`${this.localAI.ollamaURL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload)
            });
            
            console.log('🤖 [AI DEBUG] Overall Analysis Response Status:', {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            });
            
            if (!response.ok) {
                throw new Error(`Ollama analysis failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('🤖 [AI DEBUG] Overall Analysis Response Data:', {
                responseLength: data.response?.length || 0,
                hasResponse: !!data.response,
                responsePreview: data.response?.substring(0, 200) + '...'
            });
            
            const analysis = this.parseOverallAnalysis(data.response);
            this.displayOverallAnalysis(analysis);
            
        } catch (error) {
            console.error('Ollama overall analysis failed:', error);
            // Fallback to rule-based recommendations
            this.generateOverallRecommendations();
        }
    }
    
    buildStackSummary() {
        const filteredData = this.getFilteredTechData();
        return filteredData.map(tech => ({
            name: this.normalizeTechName(tech.technology),
            current: tech.currentVersion,
            latest: tech.latestVersion,
            environment: tech.environment,
            priority: tech.aiPriority || 'unknown',
            eolDate: tech.eolDate,
            recommendations: tech.recommendations || [],
            category: tech.category || 'unknown'
        }));
    }
    
    normalizeTechName(techName) {
        if (!techName) return '';
        
        // Case-insensitive normalization mapping
        const normalizedNames = {
            'react': 'React',
            'vue': 'Vue.js',
            'angular': 'Angular',
            'nodejs': 'Node.js',
            'node': 'Node.js',
            'node.js': 'Node.js',
            'javascript': 'JavaScript',
            'typescript': 'TypeScript',
            'python': 'Python',
            'java': 'Java',
            'spring': 'Spring',
            'springboot': 'Spring Boot',
            'spring-boot': 'Spring Boot',
            'postgresql': 'PostgreSQL',
            'postgres': 'PostgreSQL',
            'mysql': 'MySQL',
            'mongodb': 'MongoDB',
            'redis': 'Redis',
            'docker': 'Docker',
            'kubernetes': 'Kubernetes',
            'nginx': 'Nginx',
            'apache': 'Apache',
            'golang': 'Go',
            'go': 'Go',
            'rust': 'Rust',
            'php': 'PHP',
            'dotnet': '.NET',
            '.net': '.NET',
            'csharp': 'C#',
            'c#': 'C#'
        };
        
        const lowercaseName = techName.toLowerCase().trim();
        return normalizedNames[lowercaseName] || techName;
    }
    
    buildOverallAnalysisPrompt(stackSummary) {
        const techList = stackSummary.map(tech => 
            `${tech.name} (Current: ${tech.current}, Latest: ${tech.latest || 'Unknown'}, Product: ${tech.product || 'Unknown'}, Priority: ${tech.priority})`
        ).join('\\n');
        
        const criticalTechs = stackSummary.filter(t => t.priority === 'critical').length;
        const highTechs = stackSummary.filter(t => t.priority === 'high').length;
        
        return `Analyze this complete technology stack and provide strategic recommendations:

TECHNOLOGY STACK (${stackSummary.length} technologies):
${techList}

CURRENT PRIORITIES:
- Critical issues: ${criticalTechs}
- High priority: ${highTechs}

Provide comprehensive analysis in JSON format:
{
  "overallHealth": "excellent|good|concerning|critical",
  "summary": "2-sentence overall assessment of the tech stack",
  "strategicPriorities": [
    "Top priority strategic action",
    "Second priority action", 
    "Third priority action"
  ],
  "riskAssessment": {
    "security": "high|medium|low",
    "maintenance": "high|medium|low", 
    "scalability": "high|medium|low",
    "compatibility": "high|medium|low"
  },
  "quickWins": [
    "Easy improvement with high impact",
    "Another quick win opportunity"
  ],
  "longTermPlan": [
    "6-month modernization goal",
    "12-month strategic goal"
  ],
  "budgetConsiderations": "Brief note on investment needed",
  "teamImpact": "Brief note on team/skills needed",
  "architecturalInsights": "Brief note on stack coherence and patterns"
}

Focus on:
- Technology compatibility and synergy across the stack
- Security implications of current version combinations  
- Modernization opportunities and migration paths
- Resource allocation priorities
- Technical debt assessment`;
    }
    
    parseOverallAnalysis(response) {
        try {
            // Strategy 1: Try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                let jsonStr = jsonMatch[0];
                // Clean up any potential formatting issues
                jsonStr = this.cleanJsonArrays(jsonStr);
                const parsed = JSON.parse(jsonStr);
                
                // Return structured data for nice formatting
                return {
                    overallHealth: parsed.overallHealth || 'good',
                    summary: parsed.summary || 'Technology stack analysis completed',
                    strategicPriorities: parsed.strategicPriorities || [],
                    riskAssessment: parsed.riskAssessment || {},
                    quickWins: parsed.quickWins || [],
                    longTermPlan: parsed.longTermPlan || [],
                    budgetConsiderations: parsed.budgetConsiderations || '',
                    teamImpact: parsed.teamImpact || '',
                    architecturalInsights: parsed.architecturalInsights || '',
                    isStructured: true
                };
            }
            
            // Strategy 2: Look for code blocks
            const codeBlockMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/i);
            if (codeBlockMatch) {
                let jsonStr = codeBlockMatch[1];
                jsonStr = this.cleanJsonArrays(jsonStr);
                const parsed = JSON.parse(jsonStr);
                
                return {
                    overallHealth: parsed.overallHealth || 'good',
                    summary: parsed.summary || 'Technology stack analysis completed',
                    strategicPriorities: parsed.strategicPriorities || [],
                    riskAssessment: parsed.riskAssessment || {},
                    quickWins: parsed.quickWins || [],
                    longTermPlan: parsed.longTermPlan || [],
                    budgetConsiderations: parsed.budgetConsiderations || '',
                    teamImpact: parsed.teamImpact || '',
                    architecturalInsights: parsed.architecturalInsights || '',
                    isStructured: true
                };
            }
            
            throw new Error('No JSON found in response');
        } catch (error) {
            console.warn('Failed to parse overall analysis:', error);
            console.warn('Response was:', response);
            
            // Instead of truncating, try to extract meaningful information
            const healthPattern = /(excellent|good|concerning|critical)/i;
            const healthMatch = response.match(healthPattern);
            const detectedHealth = healthMatch ? healthMatch[1].toLowerCase() : 'good';
            
            return {
                overallHealth: detectedHealth,
                summary: response.replace(/```json|```|\{[\s\S]*\}/, '').trim() || 'AI analysis completed successfully. The system has analyzed your technology stack and provided recommendations for each component.',
                isStructured: false
            };
        }
    }
    
    displayOverallAnalysis(analysis) {
        const recommendationsPanel = document.getElementById('aiRecommendations');
        const content = document.getElementById('recommendationsContent');
        
        const healthColor = {
            'excellent': '#10b981',
            'good': '#3b82f6', 
            'concerning': '#f59e0b',
            'critical': '#ef4444',
            'unknown': '#6b7280'
        }[analysis.overallHealth] || '#6b7280';
        
        const healthIcon = {
            'excellent': 'fas fa-check-circle',
            'good': 'fas fa-thumbs-up',
            'concerning': 'fas fa-exclamation-triangle', 
            'critical': 'fas fa-exclamation-circle',
            'unknown': 'fas fa-question-circle'
        }[analysis.overallHealth] || 'fas fa-heartbeat';
        
        content.innerHTML = `
            <div class="stack-health-display">
                <div class="health-header">
                    <div class="health-indicator" style="background-color: ${healthColor}">
                        <i class="${healthIcon}"></i>
                        <span class="health-status">${(analysis.overallHealth || 'unknown').toUpperCase()}</span>
                    </div>
                    <div class="health-meta">
                        <span class="tech-count">${this.getFilteredTechData().length} Technologies Analyzed</span>
                        <span class="analysis-time">${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                
                <div class="health-summary-section">
                    <h3><i class="fas fa-clipboard-list"></i> Stack Health Summary</h3>
                    <div class="summary-content">
                        ${this.formatHealthSummary(analysis)}
                    </div>
                </div>
                
                <div class="analysis-footer">
                    <div class="analysis-meta">
                        <span class="ai-provider">🤖 Generated by Ollama Local AI (${this.localAI.defaultModel})</span>
                        <span class="data-source">📊 Based on real API data</span>
                    </div>
                    <button class="re-analyze-btn" onclick="aiManager.aiAnalyzeAll()">
                        <i class="fas fa-sync-alt"></i> Re-analyze Stack
                    </button>
                </div>
            </div>
        `;
        
        recommendationsPanel.style.display = 'block';
        recommendationsPanel.scrollIntoView({ behavior: 'smooth' });
    }
    
    formatHealthSummary(analysis) {
        if (!analysis.isStructured) {
            // Fallback to simple summary for unstructured data
            return `<p class="health-summary">${this.escapeHtml(analysis.summary)}</p>`;
        }
        
        let html = `
            <div class="formatted-health-summary">
                <div class="main-summary">
                    <p class="summary-text">${this.escapeHtml(analysis.summary)}</p>
                </div>`;
        
        // Strategic Priorities Section
        if (analysis.strategicPriorities && analysis.strategicPriorities.length > 0) {
            html += `
                <div class="summary-section">
                    <h4><i class="fas fa-target"></i> Strategic Priorities</h4>
                    <ul class="priority-list">
                        ${analysis.strategicPriorities.map(priority => 
                            `<li>${this.escapeHtml(priority)}</li>`
                        ).join('')}
                    </ul>
                </div>`;
        }
        
        // Risk Assessment Section
        if (analysis.riskAssessment && Object.keys(analysis.riskAssessment).length > 0) {
            html += `
                <div class="summary-section">
                    <h4><i class="fas fa-shield-alt"></i> Risk Assessment</h4>
                    <div class="risk-grid">`;
            
            Object.entries(analysis.riskAssessment).forEach(([category, level]) => {
                const riskColor = {
                    'low': '#10b981',
                    'medium': '#f59e0b', 
                    'high': '#ef4444'
                }[level] || '#6b7280';
                
                html += `
                    <div class="risk-item">
                        <span class="risk-category">${this.escapeHtml(category.charAt(0).toUpperCase() + category.slice(1))}</span>
                        <span class="risk-level" style="background-color: ${riskColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">
                            ${this.escapeHtml(level.toUpperCase())}
                        </span>
                    </div>`;
            });
            
            html += `
                    </div>
                </div>`;
        }
        
        // Quick Wins Section
        if (analysis.quickWins && analysis.quickWins.length > 0) {
            html += `
                <div class="summary-section">
                    <h4><i class="fas fa-rocket"></i> Quick Wins</h4>
                    <ul class="wins-list">
                        ${analysis.quickWins.map(win => 
                            `<li class="quick-win">${this.escapeHtml(win)}</li>`
                        ).join('')}
                    </ul>
                </div>`;
        }
        
        // Long Term Plan Section
        if (analysis.longTermPlan && analysis.longTermPlan.length > 0) {
            html += `
                <div class="summary-section">
                    <h4><i class="fas fa-road"></i> Long Term Roadmap</h4>
                    <ul class="roadmap-list">
                        ${analysis.longTermPlan.map(plan => 
                            `<li class="roadmap-item">${this.escapeHtml(plan)}</li>`
                        ).join('')}
                    </ul>
                </div>`;
        }
        
        // Budget Considerations Section
        if (analysis.budgetConsiderations) {
            html += `
                <div class="summary-section">
                    <h4><i class="fas fa-dollar-sign"></i> Budget Considerations</h4>
                    <p class="budget-info">${this.escapeHtml(analysis.budgetConsiderations)}</p>
                </div>`;
        }
        
        // Team Impact Section
        if (analysis.teamImpact) {
            html += `
                <div class="summary-section">
                    <h4><i class="fas fa-users"></i> Team Impact</h4>
                    <p class="team-info">${this.escapeHtml(analysis.teamImpact)}</p>
                </div>`;
        }
        
        html += `</div>`;
        return html;
    }

    generateOverallRecommendations() {
        const criticalCount = this.techData.filter(t => t.aiPriority === 'critical').length;
        const highCount = this.techData.filter(t => t.aiPriority === 'high').length;
        
        if (criticalCount > 0 || highCount > 0) {
            this.showOverallRecommendations(criticalCount, highCount);
        }
    }

    showOverallRecommendations(criticalCount, highCount) {
        const content = document.getElementById('recommendationsContent');
        
        let html = '<div class="overall-recommendations">';
        html += '<h3>🤖 AI Analysis Summary</h3>';
        
        if (criticalCount > 0) {
            html += `<div class="recommendation-item critical">
                <h4>🚨 Critical Issues Found (${criticalCount})</h4>
                <p>Immediate attention required for technologies with security risks or EOL status.</p>
            </div>`;
        }
        
        if (highCount > 0) {
            html += `<div class="recommendation-item high">
                <h4>⚠️ High Priority Updates (${highCount})</h4>
                <p>Plan upgrades within the next quarter to stay current and secure.</p>
            </div>`;
        }
        
        // Add specific recommendations
        html += '<div class="specific-recommendations">';
        html += '<h4>📋 Recommended Actions</h4>';
        html += '<ul>';
        
        this.techData
            .filter(t => t.aiPriority === 'critical' || t.aiPriority === 'high')
            .forEach(tech => {
                html += `<li><strong>${tech.technology}</strong>: ${tech.versionGap || 'Review required'}</li>`;
            });
        
        html += '</ul></div></div>';
        
        content.innerHTML = html;
        document.getElementById('aiRecommendations').style.display = 'block';
    }

    // ... (continuing in next part due to length)

    renderStats() {
        const stats = this.calculateAIStats();
        
        document.getElementById('criticalCount').textContent = stats.critical;
        document.getElementById('recommendedCount').textContent = stats.recommended;
        document.getElementById('upToDateCount').textContent = stats.upToDate;
        document.getElementById('aiInsightsCount').textContent = stats.aiInsights;
    }

    calculateAIStats() {
        const data = this.getFilteredTechData();
        return {
            critical: data.filter(t => t.aiPriority === 'critical').length,
            recommended: data.filter(t => t.aiPriority === 'high' || t.aiPriority === 'medium').length,
            upToDate: data.filter(t => t.aiPriority === 'low' || t.versionGap === 'up-to-date').length,
            aiInsights: data.filter(t => t.recommendations && t.recommendations.length > 0).length
        };
    }

    renderTechCards() {
        const container = document.getElementById('techGrid');
        container.innerHTML = '';

        const filteredData = this.getFilteredTechData();
        if (filteredData.length === 0) {
            const productFilter = this.currentProductFilter;
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-robot" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.2rem;">No technologies ${productFilter ? `for ${productFilter}` : 'added yet'}.</p>
                    <p>${productFilter ? 'Switch to "All Products" or add technologies for this product!' : 'Add a technology above to get started with AI analysis!'}</p>
                </div>
            `;
            return;
        }

        filteredData.forEach((item, index) => {
            const card = this.createAITechCard(item);
            card.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(card);
        });
    }

    createAITechCard(item) {
        const card = document.createElement('div');
        card.className = 'tech-card ai-enhanced';

        const priorityClass = item.aiPriority || 'medium';
        const priorityIcon = this.getPriorityIcon(priorityClass);
        
        const lastAnalyzed = new Date(item.lastAnalyzed).toLocaleDateString();
        
        card.innerHTML = `
            <div class="tech-card-header">
                <div class="tech-title">
                    ${this.escapeHtml(item.technology)}
                    <span class="priority-badge ${priorityClass}">
                        ${priorityIcon} ${priorityClass.toUpperCase()}
                    </span>
                </div>
                <div class="ai-badges">
                    <span class="ai-badge">🤖 AI Analyzed</span>
                    ${item.product ? `<span class="product-badge">${item.product}</span>` : ''}
                </div>
            </div>
            <div class="tech-card-body">
                <div class="version-info">
                    <div class="version-item">
                        <div class="version-label">Current Version</div>
                        <div class="version-value">${this.escapeHtml(item.currentVersion)}</div>
                    </div>
                    <div class="version-item ${item.latestVersion ? 'has-latest' : 'no-data'}">
                        <div class="version-label">Latest Version</div>
                        <div class="version-value">${this.escapeHtml(item.latestVersion || 'Checking...')}</div>
                    </div>
                </div>
                
                ${item.vulnerabilityCount !== undefined ? `
                    <div class="security-info ${item.criticalVulns > 0 ? 'critical' : item.highVulns > 0 ? 'high' : 'secure'}">
                        <div class="security-header">
                            <i class="fas fa-shield-alt"></i>
                            <span class="security-label">Security Status</span>
                            <span class="security-score">Score: ${item.securityScore || 'N/A'}/100</span>
                        </div>
                        ${item.runtimeTechnology ? `
                            <div class="security-status runtime">
                                <i class="fas fa-info-circle"></i>
                                Runtime/platform security managed by vendor
                                <div class="runtime-note">Check EOL status and vendor security advisories</div>
                            </div>
                        ` : item.vulnerabilityCount === 0 ? `
                            <div class="security-status secure">
                                <i class="fas fa-check-circle"></i>
                                No known vulnerabilities
                            </div>
                        ` : `
                            <div class="vulnerability-summary">
                                <div class="vuln-counts">
                                    ${item.criticalVulns > 0 ? `<span class="vuln-count critical">${item.criticalVulns} Critical</span>` : ''}
                                    ${item.highVulns > 0 ? `<span class="vuln-count high">${item.highVulns} High</span>` : ''}
                                    <span class="vuln-total">${item.vulnerabilityCount} total vulnerabilities</span>
                                </div>
                                <button class="view-vulns-btn" onclick="aiManager.showVulnerabilityDetails('${item.id}')">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    View Details
                                </button>
                            </div>
                        `}
                    </div>
                ` : ''}
                
                ${item.versionGap ? `
                    <div class="version-gap ${priorityClass}">
                        <i class="fas fa-chart-line"></i>
                        <span>${this.escapeHtml(item.versionGap)}</span>
                    </div>
                ` : ''}
                
                ${item.eolDate ? `
                    <div class="eol-info">
                        <div class="eol-label">
                            ${item.eolCycle ? `End of Life (${item.eolCycle})` : 'End of Life'}
                        </div>
                        <div class="eol-value">${this.escapeHtml(item.eolDate)}</div>
                        ${item.supportStatus && item.supportStatus !== item.eolDate ? `
                            <div class="support-info">Support: ${this.escapeHtml(item.supportStatus)}</div>
                        ` : ''}
                        <!-- Debug info: Support Status = ${item.supportStatus || 'N/A'} -->
                    </div>
                ` : ''}
                
                ${item.recommendations && item.recommendations.length > 0 ? `
                    <div class="ai-recommendations-mini">
                        <div class="recommendations-label">
                            <i class="fas fa-lightbulb"></i>
                            AI Insights
                        </div>
                        <div class="recommendations-content">
                            ${item.recommendations.slice(0, 2).map(rec => 
                                `<div class="recommendation">${this.escapeHtml(rec)}</div>`
                            ).join('')}
                            ${item.recommendations.length > 2 ? 
                                `<div class="more-recommendations">+${item.recommendations.length - 2} more insights</div>` 
                                : ''
                            }
                        </div>
                    </div>
                ` : ''}
                
                ${item.nextSteps && item.nextSteps.length > 0 ? `
                    <div class="next-steps">
                        <div class="steps-label">
                            <i class="fas fa-tasks"></i>
                            Next Steps
                        </div>
                        <div class="steps-content">
                            ${item.nextSteps.slice(0, 3).map(step => 
                                `<div class="step">${this.escapeHtml(step)}</div>`
                            ).join('')}
                        </div>
                        <div class="upgrade-plan-section">
                            <button class="upgrade-plan-btn" onclick="aiManager.showDetailedUpgradePlan('${item.id}')">
                                <i class="fas fa-route"></i>
                                Get Detailed Upgrade Plan
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="tech-card-footer">
                <div class="card-actions">
                    ${item.checkUrl ? `
                        <a href="${item.checkUrl}" target="_blank" class="action-link">
                            <i class="fas fa-external-link-alt"></i>
                            Docs
                        </a>
                    ` : ''}
                    <button class="action-btn" onclick="aiManager.reanalyze('${item.id}')">
                        <i class="fas fa-sync-alt"></i>
                        Re-analyze
                    </button>
                    <button class="action-btn delete" onclick="aiManager.deleteTech('${item.id}')">
                        <i class="fas fa-trash"></i>
                        Remove
                    </button>
                </div>
                <div class="meta-info">
                    <span class="analyzed-date">Analyzed: ${lastAnalyzed}</span>
                </div>
            </div>
        `;

        return card;
    }

    getPriorityIcon(priority) {
        const icons = {
            'critical': '🚨',
            'high': '⚠️',
            'medium': '📊',
            'low': '✅'
        };
        return icons[priority] || '📊';
    }

    // Utility methods
    clearForm() {
        document.getElementById('addTechForm').reset();
        this.hideSuggestions();
    }

    saveData() {
        localStorage.setItem('aiTechStackData', JSON.stringify(this.techData));
        this.updateLastSync();
    }

    loadStoredData() {
        const stored = localStorage.getItem('aiTechStackData');
        if (stored) {
            this.techData = JSON.parse(stored);
            this.updateProductTabs();
        }
    }

    // Product tab methods
    updateProductTabs() {
        const tabsContainer = document.getElementById('productTabs');
        const products = [...new Set(this.techData.map(tech => tech.product).filter(Boolean))].sort();
        
        // Clear existing tabs except "All Products"
        tabsContainer.innerHTML = `
            <button class="tab-button ${!this.currentProductFilter ? 'active' : ''}" data-product="" id="allProductsTab">
                <i class="fas fa-layer-group"></i> All Products
            </button>
        `;
        
        // Add product tabs
        products.forEach(product => {
            const button = document.createElement('button');
            button.className = `tab-button ${this.currentProductFilter === product ? 'active' : ''}`;
            button.dataset.product = product;
            button.innerHTML = `<i class="fas fa-cube"></i> ${product}`;
            tabsContainer.appendChild(button);
        });
    }

    switchToProduct(product) {
        // Update active tab
        document.querySelectorAll('.tab-button').forEach(tab => tab.classList.remove('active'));
        const activeTab = document.querySelector(`[data-product="${product}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        // Update current filter
        this.currentProductFilter = product;
        
        // Re-render data
        this.renderTechCards();
        this.renderStats();
        
        // Update AI Analysis button text to reflect current product
        const aiButton = document.getElementById('aiAnalyzeAll');
        if (product) {
            aiButton.innerHTML = `<i class="fas fa-brain"></i> AI Analysis (${product})`;
        } else {
            aiButton.innerHTML = `<i class="fas fa-brain"></i> AI Analysis`;
        }
    }

    getFilteredTechData() {
        if (!this.currentProductFilter) {
            return this.techData;
        }
        return this.techData.filter(tech => tech.product === this.currentProductFilter);
    }

    updateLastSync() {
        const now = new Date().toLocaleString();
        document.getElementById('lastSync').textContent = now;
    }

    // ... (additional utility methods)
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeIcon();
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    showLoading(message) {
        const loading = document.getElementById('loading');
        const loadingText = loading.querySelector('p');
        if (loadingText) loadingText.textContent = message;
        loading.style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    updateLoadingStep() {
        const steps = document.querySelectorAll('.loading-steps .step');
        const activeIndex = Array.from(steps).findIndex(step => step.classList.contains('active'));
        
        if (activeIndex >= 0 && activeIndex < steps.length - 1) {
            steps[activeIndex].classList.remove('active');
            steps[activeIndex + 1].classList.add('active');
        }
    }

    showError(message) {
        document.getElementById('errorText').textContent = message;
        document.getElementById('errorMessage').style.display = 'block';
        setTimeout(() => {
            document.getElementById('errorMessage').style.display = 'none';
        }, 5000);
    }

    // Additional methods for reanalysis, deletion, etc.
    async reanalyze(techId) {
        const tech = this.techData.find(t => t.id === techId);
        if (!tech) return;

        this.showLoading(`Re-analyzing ${tech.technology}...`);

        try {
            const updated = await this.aiAnalyzeTechnology(
                tech.technology, 
                tech.currentVersion, 
                tech.environment
            );
            updated.id = techId;
            
            const index = this.techData.findIndex(t => t.id === techId);
            this.techData[index] = updated;
            
            this.saveData();
            this.renderStats();
            this.renderTechCards();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to re-analyze: ${error.message}`);
        }
    }
    
    async showDetailedUpgradePlan(techId) {
        const tech = this.techData.find(t => t.id === techId);
        if (!tech) return;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal upgrade-plan-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2><i class="fas fa-route"></i> Detailed Upgrade Plan: ${tech.technology}</h2>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="upgrade-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>AI is creating your detailed upgrade plan...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        try {
            if (this.localAI.enabled && this.localAI.available) {
                const upgradePlan = await this.generateOllamaUpgradePlan(tech);
                this.displayUpgradePlan(modal, upgradePlan, tech);
            } else {
                // No fallback to predefined plans - require AI for detailed planning
                this.displayNoAIUpgradePlan(modal, tech);
            }
        } catch (error) {
            console.error('Failed to generate upgrade plan:', error);
            this.displayUpgradePlanError(modal, tech, error.message);
        }
    }

    async showDetailedUpgradePlan(techId) {
        const tech = this.techData.find(t => t.id === techId);
        if (!tech) return;
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal upgrade-plan-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2><i class="fas fa-route"></i> Detailed Upgrade Plan: ${tech.technology}</h2>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="upgrade-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>AI is creating your detailed upgrade plan...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        try {
            if (this.localAI.enabled && this.localAI.available) {
                const upgradePlan = await this.generateOllamaUpgradePlan(tech);
                this.displayUpgradePlan(modal, upgradePlan, tech);
            } else {
                // No fallback to predefined plans - require AI for detailed planning
                this.displayNoAIUpgradePlan(modal, tech);
            }
        } catch (error) {
            console.error('Failed to generate upgrade plan:', error);
            this.displayUpgradePlanError(modal, tech, error.message);
        }
    }

    displayUpgradePlanModal(tech, plan) {
        // Create and show modal with detailed upgrade plan
        const modal = document.createElement('div');
        modal.className = 'upgrade-plan-modal';
        modal.innerHTML = `
            <div class="upgrade-plan-content">
                <div class="upgrade-plan-header">
                    <h2>🚀 Detailed Upgrade Plan: ${this.escapeHtml(tech.technology)} ${tech.currentVersion} → ${tech.latestVersion}</h2>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="upgrade-plan-body">
                    <div class="plan-overview">
                        <h3>📋 Overview</h3>
                        <p>${plan.overview || 'No overview provided.'}</p>
                        <div class="timeline-badge">
                            <i class="fas fa-clock"></i>
                            ${plan.timeline || 'Timeline not specified'}
                        </div>
                    </div>
                    
                    <div class="plan-phases">
                        <h3>🗓️ Migration Phases</h3>
                        ${plan.phases.map(phase => `
                            <div class="phase-card">
                                <h4>${phase.name}</h4>
                                <ul>
                                    ${phase.tasks.map(task => `<li>${task}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="plan-risks">
                        <h3>⚠️ Risk Management</h3>
                        ${plan.risks.map(risk => `
                            <div class="risk-item">
                                <div class="risk-title">Risk: ${risk.risk}</div>
                                <div class="risk-mitigation">Mitigation: ${risk.mitigation}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="plan-testing">
                        <h3>🧪 Testing Strategy</h3>
                        <ul>
                            ${(plan.testing || []).map(test => `<li>${test}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-rollback">
                        <h3>🔄 Rollback Strategy</h3>
                        <ul>
                            ${(plan.rollback || []).map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-industry">
                        <h3>🏢 Industry Best Practices</h3>
                        <ul>
                            ${(plan.industryBestPractices || []).map(practice => `<li>${practice}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-microservices">
                        <h3>🔧 Microservices Considerations</h3>
                        ${(plan.microservicesConsiderations || []).map(consideration => `
                            <div class="microservice-item">
                                <div class="ms-aspect">${consideration.aspect}</div>
                                <div class="ms-consideration">${consideration.consideration}</div>
                                <div class="ms-action">Action: ${consideration.action}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="plan-resources">
                        <h3>📚 Resources & Documentation</h3>
                        <ul>
                            ${(plan.resources || []).map(resource => `<li>${resource}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div class="upgrade-plan-footer">
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Close
                    </button>
                    <button class="btn-primary" onclick="aiManager.exportUpgradePlan('${tech.id}')">
                        <i class="fas fa-download"></i>
                        Export Plan
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    exportUpgradePlan(techId) {
        const tech = this.techData.find(t => t.id === techId);
        if (!tech) return;

        // This would generate the plan again and export as PDF/markdown
        this.showError('Export functionality coming soon! Plan can be copied from the modal for now.');
    }

    showRemoveAllConfirmation() {
        if (this.techData.length === 0) {
            this.showError('No technologies to remove.');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content remove-all-modal">
                <div class="modal-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Confirm Remove All</h2>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="warning-message">
                        <i class="fas fa-trash-alt"></i>
                        <div>
                            <h3>Remove All Technologies</h3>
                            <p>This will permanently delete all <strong>${this.techData.length} technologies</strong> from your dashboard.</p>
                            <p class="warning-text">⚠️ This action cannot be undone. Make sure to export your data first if you want to keep it.</p>
                        </div>
                    </div>
                    <div class="confirmation-options">
                        <label class="checkbox-container">
                            <input type="checkbox" id="confirmRemoveAll">
                            <span class="checkmark"></span>
                            I understand this action is permanent and cannot be undone
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Cancel
                    </button>
                    <button class="btn-danger" id="confirmRemoveAllBtn" disabled onclick="aiManager.removeAllTechnologies(); this.parentElement.parentElement.parentElement.remove();">
                        <i class="fas fa-trash-alt"></i> Remove All
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Enable/disable confirm button based on checkbox
        const checkbox = modal.querySelector('#confirmRemoveAll');
        const confirmBtn = modal.querySelector('#confirmRemoveAllBtn');
        
        checkbox.addEventListener('change', () => {
            confirmBtn.disabled = !checkbox.checked;
            confirmBtn.style.opacity = checkbox.checked ? '1' : '0.5';
        });
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    removeAllTechnologies() {
        this.showLoading('Removing all technologies...');
        
        // Clear the data
        this.techData = [];
        this.saveData();
        
        // Update the UI
        this.renderStats();
        this.renderTechCards();
        
        // Hide recommendations panel if open
        document.getElementById('aiRecommendations').style.display = 'none';
        
        this.hideLoading();
        
        // Show success message
        this.showMessage('All technologies have been removed successfully.', 'success');
        
        // Optional: Show empty state message
        setTimeout(() => {
            if (this.techData.length === 0) {
                this.showEmptyState();
            }
        }, 1000);
    }

    showEmptyState() {
        const techGrid = document.getElementById('techGrid');
        techGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-plus-circle"></i>
                </div>
                <h3>No Technologies Added Yet</h3>
                <p>Start building your tech stack by adding your first technology above.</p>
                <button class="btn-primary" onclick="document.getElementById('techName').focus()">
                    <i class="fas fa-plus"></i> Add Your First Technology
                </button>
            </div>
        `;
    }

    deleteTech(techId) {
        if (confirm('Are you sure you want to remove this technology?')) {
            this.techData = this.techData.filter(t => t.id !== techId);
            this.saveData();
            this.renderStats();
            this.renderTechCards();
        }
    }

    // Export functionality
    exportData() {
        const dataStr = JSON.stringify(this.techData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tech-stack-ai-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // More methods...
    showImportModal() {
        document.getElementById('importModal').style.display = 'flex';
    }

    hideImportModal() {
        document.getElementById('importModal').style.display = 'none';
    }

    showVulnerabilityDetails(techId) {
        const tech = this.techData.find(t => t.id === techId);
        if (!tech || !tech.vulnerabilities) {
            this.showMessage('No vulnerability data available for this technology', 'info');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal vulnerability-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>🛡️ Security Vulnerabilities: ${this.escapeHtml(tech.technology)}</h3>
                    <span class="close-modal" onclick="aiManager.closeModal(this)">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="vulnerability-overview">
                        <div class="security-summary">
                            <div class="security-score-display">
                                <div class="score-circle ${tech.securityScore >= 80 ? 'good' : tech.securityScore >= 60 ? 'warning' : 'critical'}">
                                    <div class="score-value">${tech.securityScore || 0}</div>
                                    <div class="score-label">Security Score</div>
                                </div>
                            </div>
                            <div class="vulnerability-stats">
                                <div class="stat-item critical">
                                    <div class="stat-count">${tech.criticalVulns || 0}</div>
                                    <div class="stat-label">Critical</div>
                                </div>
                                <div class="stat-item high">
                                    <div class="stat-count">${tech.highVulns || 0}</div>
                                    <div class="stat-label">High</div>
                                </div>
                                <div class="stat-item medium">
                                    <div class="stat-count">${tech.vulnerabilities.filter(v => v.severity === 'medium').length || 0}</div>
                                    <div class="stat-label">Medium</div>
                                </div>
                                <div class="stat-item low">
                                    <div class="stat-count">${tech.vulnerabilities.filter(v => v.severity === 'low').length || 0}</div>
                                    <div class="stat-label">Low</div>
                                </div>
                            </div>
                        </div>
                        <div class="tech-info">
                            <div class="tech-version">
                                <strong>${this.escapeHtml(tech.technology)} v${this.escapeHtml(tech.currentVersion)}</strong>
                            </div>
                            <div class="last-checked">
                                Last checked: ${new Date(tech.lastSecurityCheck).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    ${tech.vulnerabilities.length === 0 ? `
                        <div class="no-vulnerabilities">
                            <i class="fas fa-shield-alt"></i>
                            <h4>No Known Vulnerabilities</h4>
                            <p>This version appears to be secure with no known vulnerabilities in our database.</p>
                        </div>
                    ` : `
                        <div class="vulnerabilities-list">
                            <div class="list-header">
                                <h4>Vulnerability Details</h4>
                                <div class="filter-buttons">
                                    <button class="filter-btn active" onclick="aiManager.filterVulnerabilities('all')">All</button>
                                    <button class="filter-btn" onclick="aiManager.filterVulnerabilities('critical')">Critical</button>
                                    <button class="filter-btn" onclick="aiManager.filterVulnerabilities('high')">High</button>
                                </div>
                            </div>
                            <div class="vulnerabilities-container">
                                ${tech.vulnerabilities.map(vuln => `
                                    <div class="vulnerability-item" data-severity="${vuln.severity}">
                                        <div class="vuln-header">
                                            <div class="vuln-id">
                                                <strong>${this.escapeHtml(vuln.id)}</strong>
                                                <span class="severity-badge ${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                                            </div>
                                            <div class="vuln-date">
                                                ${vuln.published ? new Date(vuln.published).toLocaleDateString() : 'Unknown date'}
                                            </div>
                                        </div>
                                        <div class="vuln-summary">
                                            ${this.escapeHtml(vuln.summary)}
                                        </div>
                                        ${vuln.aliases && vuln.aliases.length > 0 ? `
                                            <div class="vuln-aliases">
                                                <strong>Also known as:</strong> ${vuln.aliases.map(alias => this.escapeHtml(alias)).join(', ')}
                                            </div>
                                        ` : ''}
                                        ${vuln.references && vuln.references.length > 0 ? `
                                            <div class="vuln-references">
                                                <strong>References:</strong>
                                                ${vuln.references.slice(0, 3).map(ref => `
                                                    <a href="${ref.url}" target="_blank" class="ref-link">
                                                        ${ref.type || 'Reference'} <i class="fas fa-external-link-alt"></i>
                                                    </a>
                                                `).join('')}
                                                ${vuln.references.length > 3 ? `<span class="more-refs">+${vuln.references.length - 3} more</span>` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `}

                    <div class="vulnerability-actions">
                        <button class="btn-primary" onclick="aiManager.refreshVulnerabilityData('${tech.id}')">
                            <i class="fas fa-sync-alt"></i> Refresh Security Data
                        </button>
                        <button class="btn-secondary" onclick="aiManager.closeModal(this)">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    filterVulnerabilities(severity) {
        const vulnerabilityItems = document.querySelectorAll('.vulnerability-item');
        const filterButtons = document.querySelectorAll('.filter-btn');

        // Update active button
        filterButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Filter vulnerabilities
        vulnerabilityItems.forEach(item => {
            if (severity === 'all' || item.dataset.severity === severity) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    async refreshVulnerabilityData(techId) {
        const tech = this.techData.find(t => t.id === techId);
        if (!tech) return;

        try {
            this.showMessage('Refreshing vulnerability data...', 'info');
            
            const vulnInfo = await this.checkVulnerabilities(tech.technology, tech.currentVersion, tech.detectedType);
            if (vulnInfo) {
                tech.vulnerabilities = vulnInfo.vulnerabilities;
                tech.vulnerabilityCount = vulnInfo.count;
                tech.criticalVulns = vulnInfo.critical;
                tech.highVulns = vulnInfo.high;
                tech.securityScore = vulnInfo.securityScore;
                tech.lastSecurityCheck = new Date().toISOString();
                
                this.saveData();
                this.renderTechCards();
                this.closeModal(document.querySelector('.vulnerability-modal'));
                this.showMessage('Vulnerability data updated successfully', 'success');
            } else {
                this.showMessage('Could not retrieve vulnerability data', 'warning');
            }
        } catch (error) {
            this.showMessage('Failed to refresh vulnerability data', 'error');
            console.error('Vulnerability refresh error:', error);
        }
    }

    closeModal(element) {
        // Find the modal container and remove it
        let modal = element;
        while (modal && !modal.classList.contains('modal')) {
            modal = modal.parentElement;
        }
        if (modal) {
            modal.remove();
        }
    }

    hideRecommendations() {
        document.getElementById('aiRecommendations').style.display = 'none';
    }

    async processImport() {
        const csvFile = document.getElementById('csvFileInput').files[0];
        const jsonData = document.getElementById('jsonDataInput').value.trim();
        const bulkData = document.getElementById('bulkAddInput').value.trim();

        try {
            if (csvFile) {
                await this.importFromCSV(csvFile);
            } else if (jsonData) {
                await this.importFromJSON(jsonData);
            } else if (bulkData) {
                await this.importFromBulk(bulkData);
            } else {
                this.showError('Please provide data to import');
                return;
            }

            this.hideImportModal();
            this.renderStats();
            this.renderTechCards();
        } catch (error) {
            this.showError(`Import failed: ${error.message}`);
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            data.push(row);
        }
        
        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    async importFromCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const csvText = e.target.result;
                    const parsedData = this.parseCSV(csvText);
                    
                    this.showLoading('Importing and analyzing CSV data...');
                    
                    for (const item of parsedData) {
                        if (item.Technology && item['Version in use']) {
                            const aiAnalysis = await this.aiAnalyzeTechnology(
                                item.Technology,
                                item['Version in use'],
                                'imported'
                            );
                            
                            // Merge existing data with AI analysis
                            if (item.Notes) aiAnalysis.notes = item.Notes;
                            if (item['Check URL']) aiAnalysis.checkUrl = item['Check URL'];
                            
                            this.techData.push(aiAnalysis);
                        }
                    }
                    
                    this.saveData();
                    this.hideLoading();
                    resolve();
                } catch (error) {
                    this.hideLoading();
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    async importFromJSON(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            const importData = Array.isArray(data) ? data : [data];
            
            this.showLoading('Importing and analyzing JSON data...');
            
            for (const item of importData) {
                if (item.technology && item.currentVersion) {
                    const aiAnalysis = await this.aiAnalyzeTechnology(
                        item.technology,
                        item.currentVersion,
                        item.environment || 'imported'
                    );
                    this.techData.push(aiAnalysis);
                }
            }
            
            this.saveData();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            throw new Error('Invalid JSON format');
        }
    }

    async importFromBulk(bulkText) {
        const lines = bulkText.split('\n').filter(line => line.trim());
        
        this.showLoading('Importing and analyzing bulk data...');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // Parse format: "Technology Version" or "Technology,Version"
            let technology, version;
            
            if (trimmedLine.includes(',')) {
                [technology, version] = trimmedLine.split(',').map(s => s.trim());
            } else {
                // Split by space, taking last part as version
                const parts = trimmedLine.split(' ');
                version = parts.pop();
                technology = parts.join(' ');
            }
            
            if (technology && version) {
                try {
                    const aiAnalysis = await this.aiAnalyzeTechnology(
                        technology,
                        version,
                        'bulk-import'
                    );
                    this.techData.push(aiAnalysis);
                    
                    // Small delay to prevent API rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                    console.warn(`Failed to analyze ${technology} ${version}:`, error);
                    // Add basic entry even if AI analysis fails
                    this.techData.push({
                        id: Date.now().toString() + Math.random(),
                        technology: technology,
                        currentVersion: version,
                        environment: 'bulk-import',
                        addedDate: new Date().toISOString(),
                        lastAnalyzed: new Date().toISOString(),
                        aiPriority: 'medium',
                        recommendations: ['⚠️ Manual review required - auto-analysis failed'],
                        nextSteps: ['🔍 Manually check latest version and EOL status']
                    });
                }
            }
        }
        
        this.saveData();
        this.hideLoading();
    }

    filterData() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const priorityFilter = document.getElementById('priorityFilter').value;

        this.filteredData = this.techData.filter(item => {
            const matchesSearch = !searchTerm || 
                item.technology?.toLowerCase().includes(searchTerm) ||
                item.currentVersion?.toLowerCase().includes(searchTerm) ||
                item.latestVersion?.toLowerCase().includes(searchTerm) ||
                item.recommendations?.some(rec => rec.toLowerCase().includes(searchTerm));

            const matchesPriority = !priorityFilter || 
                item.aiPriority?.toLowerCase() === priorityFilter;

            return matchesSearch && matchesPriority;
        });

        this.renderTechCards();
    }

    sortData(sortBy) {
        switch (sortBy) {
            case 'technology':
                this.filteredData.sort((a, b) => 
                    (a.technology || '').localeCompare(b.technology || ''));
                break;
            case 'priority':
                const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1, '': 0 };
                this.filteredData.sort((a, b) => 
                    (priorityOrder[b.aiPriority?.toLowerCase()] || 0) - 
                    (priorityOrder[a.aiPriority?.toLowerCase()] || 0));
                break;
            case 'eol':
                this.filteredData.sort((a, b) => {
                    const eolA = this.parseEOLDate(a.eolDate);
                    const eolB = this.parseEOLDate(b.eolDate);
                    if (!eolA && !eolB) return 0;
                    if (!eolA) return 1;
                    if (!eolB) return -1;
                    return eolA - eolB;
                });
                break;
            case 'lastAnalyzed':
                this.filteredData.sort((a, b) => 
                    new Date(b.lastAnalyzed || 0) - new Date(a.lastAnalyzed || 0));
                break;
        }

        this.renderTechCards();
    }

    // Background sync
    async backgroundSync() {
        console.log('Background sync running...');
        if (this.techData.length === 0) return;
        
        try {
            // Re-analyze one technology every background sync
            const randomIndex = Math.floor(Math.random() * this.techData.length);
            const tech = this.techData[randomIndex];
            
            const updated = await this.aiAnalyzeTechnology(
                tech.technology, 
                tech.currentVersion, 
                tech.environment
            );
            updated.id = tech.id;
            this.techData[randomIndex] = updated;
            
            this.saveData();
            this.updateLastSync();
        } catch (error) {
            console.warn('Background sync failed:', error);
        }
    }

    // Local AI Integration Methods
    async initializeLocalAI() {
        try {
            const response = await fetch(`${this.localAI.ollamaURL}/api/tags`, {
                signal: AbortSignal.timeout(2000)
            });
            
            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];
                this.localAI.available = models.some(model => 
                    model.name.includes('llama') || model.name.includes('mistral')
                );
                
                if (this.localAI.available && !this.localAI.enabled) {
                    this.showLocalAIPrompt();
                } else if (this.localAI.available && this.localAI.enabled) {
                    this.showAIStatus('🤖 Local AI Ready (Ollama)');
                }
            }
        } catch (error) {
            this.localAI.available = false;
            if (this.localAI.enabled) {
                this.showAIStatus('⚠️ Ollama not running - using rule-based analysis');
            }
        }
    }

    showLocalAIPrompt() {
        const notification = document.createElement('div');
        notification.className = 'ai-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">🤖</div>
                <div class="notification-text">
                    <h4>Local AI Available!</h4>
                    <p>Ollama detected. Enable local AI for enhanced analysis?</p>
                </div>
                <div class="notification-actions">
                    <button onclick="aiManager.enableLocalAI()" class="btn-primary btn-sm">
                        Enable AI
                    </button>
                    <button onclick="this.parentElement.parentElement.remove()" class="btn-secondary btn-sm">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds if no action
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    enableLocalAI() {
        this.localAI.enabled = true;
        localStorage.setItem('localAI_enabled', 'true');
        this.showAIStatus('🤖 Local AI Enabled!');
        
        // Remove any existing notifications
        document.querySelectorAll('.ai-notification').forEach(el => el.remove());
        
        // Re-analyze existing technologies with AI
        if (this.techData.length > 0) {
            this.showConfirmAIReanalysis();
        }
    }

    showConfirmAIReanalysis() {
        if (confirm('Re-analyze existing technologies with local AI? This will provide enhanced insights.')) {
            this.aiAnalyzeAll();
        }
    }

    async performOllamaAnalysis(techData, knownTech) {
        try {
            const prompt = this.buildOllamaPrompt(techData, knownTech);
            
            const response = await fetch(`${this.localAI.ollamaURL}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.localAI.defaultModel,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.3,
                        num_ctx: 4096
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseOllamaResponse(data.response, techData, knownTech);

        } catch (error) {
            console.warn('Ollama analysis failed:', error);
            this.localAI.available = false;
            throw error;
        }
    }

    buildOllamaPrompt(techData, knownTech) {
        const versionContext = this.buildVersionContext(techData);
        const vulnerabilityContext = this.buildVulnerabilityContext(techData);
        
        return `You are a DevOps expert analyzing a technology stack component. Provide specific, actionable analysis.

TECHNOLOGY: ${techData.technology}
CURRENT VERSION: ${techData.currentVersion}
LATEST VERSION: ${techData.latestVersion || 'Unknown'}
CATEGORY: ${knownTech?.category || 'Unknown'}
EOL DATE: ${techData.eolDate || 'Unknown'}
ENVIRONMENT: ${techData.environment || 'Not specified'}

${versionContext}

${vulnerabilityContext}

Analyze this technology and respond with JSON in this exact format:
{
  "priority": "critical|high|medium|low",
  "summary": "One sentence summary of the current state",
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2", 
    "Specific recommendation 3"
  ],
  "risks": [
    "Security or compatibility risk",
    "Performance or maintenance risk"
  ],
  "nextSteps": [
    "Immediate action to take",
    "Planning step",
    "Implementation milestone"
  ],
  "urgency": "Timeframe for action (e.g., '2-4 weeks', 'next quarter')",
  "complexity": "low|medium|high"
}

CRITICAL RULES:
- NEVER INVENT VERSION NUMBERS: Only use versions explicitly listed above
- CURRENT VERSION: ${techData.currentVersion} - LATEST VERSION: ${techData.latestVersion || 'Unknown'}
- If suggesting upgrades, use ONLY the LATEST VERSION number provided
- If LATEST VERSION is "Unknown", use phrases like "latest stable version" NOT specific numbers
- FORBIDDEN: Do not suggest version 27, 25+, 26+, or any version not explicitly provided
- Only recommend upgrades to NEWER versions, never suggest downgrading to older versions
- Understand version chronology and semantic versioning (higher numbers are typically newer)
- When suggesting version changes, ensure they represent actual improvements (security, features, performance)
- If downgrading is absolutely necessary due to compatibility issues, clearly explain why
- SECURITY PRIORITY: If there are Critical vulnerabilities, set priority to "critical" and urgency to immediate
- SECURITY PRIORITY: If there are High vulnerabilities, set priority to "high" and address urgently
- Factor security vulnerabilities heavily into risk assessment and upgrade urgency

Focus on:
- Security implications of the current version
- Performance benefits of upgrading to newer (not older) versions
- Compatibility concerns with modern libraries
- Enterprise/production considerations
- Specific migration steps that make logical sense

Be concise but specific about versions and provide actionable steps.`;
    }

    buildVersionContext(techData) {
        const currentVersion = techData.currentVersion;
        const latestVersion = techData.latestVersion;
        
        let context = `CONTEXT: Currently running ${techData.technology} version ${currentVersion}.`;
        
        if (latestVersion && latestVersion !== 'Unknown') {
            context += ` Latest available version is ${latestVersion}.`;
            context += ` CONSTRAINT: You must ONLY recommend upgrading to version ${latestVersion}. Do not suggest any other version numbers.`;
        } else {
            context += ` Latest version is unknown - CONSTRAINT: You must NOT suggest any specific version numbers.`;
        }
        
        context += ` Always recommend upgrading to newer versions for better security, performance, and features. Never suggest downgrading to older versions unless there are critical compatibility issues that cannot be resolved otherwise.`;
        
        return context;
    }

    parseOllamaResponse(response, techData) {
        try {
            // Extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            // Version validation - check for invalid version suggestions
            const responseText = JSON.stringify(parsed);
            const currentVersion = techData.currentVersion || '';
            const latestVersion = techData.latestVersion || '';
            
            // Look for version numbers that aren't in our provided data
            const versionPattern = /version\s+(\d+(?:\.\d+)*(?:\+)?)/gi;
            const suggestedVersions = [];
            let match;
            while ((match = versionPattern.exec(responseText)) !== null) {
                suggestedVersions.push(match[1]);
            }
            
            // Validate suggested versions
            for (const version of suggestedVersions) {
                if (version !== currentVersion && 
                    version !== latestVersion && 
                    !currentVersion.includes(version) && 
                    !latestVersion.includes(version)) {
                    console.warn(`🚨 VERSION VALIDATION: AI suggested invalid version ${version} for ${techData.technology}. Current: ${currentVersion}, Latest: ${latestVersion}`);
                }
            }
            
            return {
                aiPriority: parsed.priority || 'medium',
                aiSummary: parsed.summary || '',
                aiCategory: parsed.category || 'other',
                recommendations: parsed.recommendations || [],
                nextSteps: parsed.nextSteps || [],
                aiRisks: parsed.risks || [],
                aiBenefits: parsed.benefits || [],
                aiUrgency: parsed.urgency || '',
                upgradeComplexity: parsed.complexity || 'medium',
                enhancedByAI: true,
                aiProvider: 'ollama-local',
                analysisDate: new Date().toISOString(),
                // Include original analysis data
                securityScore: this.calculateSecurityScore(techData, parsed),
                stabilityScore: this.calculateStabilityScore(techData, parsed),
                estimatedEffort: parsed.complexity || 'medium',
                versionGap: this.analyzeVersions(techData.currentVersion, techData.latestVersion).gap
            };

        } catch (error) {
            console.warn('Failed to parse Ollama response:', error);
            
            // Fallback: return enhanced rule-based analysis with complete AI summary
            const ruleBasedAnalysis = this.performRuleBasedAnalysis(techData);
            return {
                ...ruleBasedAnalysis,
                aiSummary: response.replace(/```json|```|\{[\s\S]*\}/, '').trim() || 'AI analysis completed for this technology component.',
                enhancedByAI: true,
                aiProvider: 'ollama-local-fallback'
            };
        }
    }

    performRuleBasedAnalysis(techData) {
        // Version analysis
        const versionAnalysis = this.analyzeVersions(techData.currentVersion, techData.latestVersion);
        
        // EOL and Support analysis
        const lifecycleAnalysis = this.analyzeEOL(techData.eolDate, techData.supportStatus);
        
        // Determine final priority - EOL/Support takes precedence over version gaps
        const priorities = ['low', 'medium', 'high', 'critical'];
        const versionPriority = priorities.indexOf(versionAnalysis.priority);
        const lifecyclePriority = priorities.indexOf(lifecycleAnalysis.priority);
        
        // If lifecycle is medium+ priority, use it; otherwise use higher of version or lifecycle
        const finalPriority = lifecyclePriority >= 1 ? 
            priorities[lifecyclePriority] : 
            priorities[Math.max(versionPriority, lifecyclePriority)];
        
        // Combine recommendations
        const allRecommendations = [
            ...this.generateBasicRecommendations(techData),
            ...lifecycleAnalysis.recommendations
        ];
        
        return {
            aiPriority: finalPriority,
            versionGap: versionAnalysis.gap,
            recommendations: allRecommendations,
            nextSteps: this.generateBasicNextSteps(techData),
            securityScore: lifecyclePriority >= 2 ? 70 : 85, // Lower security score if support/EOL issues
            stabilityScore: 90,
            estimatedEffort: 'medium',
            enhancedByAI: false,
            analysisType: 'rule-based'
        };
    }

    generateBasicRecommendations(techData) {
        const recommendations = [];
        
        // Generic recommendations based on version gap
        const versionGap = this.analyzeVersions(techData.currentVersion, techData.latestVersion);
        
        if (versionGap.priority === 'critical') {
            recommendations.push('🚨 Critical update required - security or compatibility issues likely');
            recommendations.push('📋 Review breaking changes immediately');
            recommendations.push('🧪 Test in development environment ASAP');
        } else if (versionGap.priority === 'high') {
            recommendations.push('⚡ Significant update available with likely improvements');
            recommendations.push('📚 Review release notes and migration guides');
            recommendations.push('🔍 Check for breaking changes');
        } else {
            recommendations.push('🔄 Consider updating when convenient');
            recommendations.push('📊 Monitor for security advisories');
            recommendations.push('📈 Review new features and improvements');
        }
        
        return recommendations;
    }

    generateBasicNextSteps(techData) {
        return [
            '📖 Review official upgrade documentation',
            '🧪 Set up testing environment',
            '📅 Plan upgrade timeline'
        ];
    }

    calculateSecurityScore(techData, aiAnalysis) {
        let score = 85;
        if (aiAnalysis.priority === 'critical') score -= 30;
        else if (aiAnalysis.priority === 'high') score -= 15;
        return Math.max(score, 0);
    }

    calculateStabilityScore(techData, aiAnalysis) {
        let score = 90;
        if (aiAnalysis.complexity === 'high') score -= 15;
        return Math.max(score, 30);
    }

    showAIStatus(message) {
        // Create or update AI status indicator
        let statusEl = document.getElementById('ai-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'ai-status';
            statusEl.className = 'ai-status-indicator';
            
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.appendChild(statusEl);
            }
        }
        
        statusEl.innerHTML = `
            <span class="ai-status-text">${message}</span>
            <button class="ai-config-btn" onclick="aiManager.showAIConfig()" title="AI Configuration">
                <i class="fas fa-cog"></i>
            </button>
        `;
    }

    showAIConfig() {
        const modal = document.createElement('div');
        modal.className = 'modal ai-config-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-brain"></i> Local AI Configuration</h2>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="ai-status-section">
                        <h3>Status</h3>
                        <div class="status-item">
                            <span>Ollama: </span>
                            <span class="${this.localAI.available ? 'status-good' : 'status-error'}">
                                ${this.localAI.available ? '✅ Available' : '❌ Not Available'}
                            </span>
                        </div>
                        <div class="status-item">
                            <span>Local AI: </span>
                            <span class="${this.localAI.enabled ? 'status-good' : 'status-neutral'}">
                                ${this.localAI.enabled ? '✅ Enabled' : '⚪ Disabled'}
                            </span>
                        </div>
                    </div>
                    
                    ${!this.localAI.available ? `
                        <div class="setup-instructions">
                            <h3>Setup Ollama</h3>
                            <p>1. Download from <a href="https://ollama.ai/download" target="_blank">ollama.ai</a></p>
                            <p>2. Run: <code>ollama run llama3.2:3b</code></p>
                            <p>3. <button onclick="location.reload()" class="btn-primary btn-sm">Refresh Page</button></p>
                        </div>
                    ` : ''}
                    
                    <div class="ai-controls">
                        <label>
                            <input type="checkbox" ${this.localAI.enabled ? 'checked' : ''} 
                                   onchange="aiManager.toggleLocalAI(this.checked)">
                            Enable Local AI Analysis
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    toggleLocalAI(enabled) {
        this.localAI.enabled = enabled;
        localStorage.setItem('localAI_enabled', enabled.toString());
        
        if (enabled && this.localAI.available) {
            this.showAIStatus('🤖 Local AI Enabled');
        } else {
            this.showAIStatus('📊 Using rule-based analysis');
        }
    }
}

// Global instance
let aiManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    aiManager = new AITechStackManager();
    window.aiManager = aiManager; // Make available globally for onclick handlers
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('techName').focus();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        document.getElementById('themeToggle').click();
    }
});