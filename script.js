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
            endoflife: 'https://endoflife.date/api'
        };
        this.knownTechnologies = this.loadKnownTechnologies();
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
        
        // Auto-sync every 5 minutes
        setInterval(() => this.backgroundSync(), 5 * 60 * 1000);
    }

    loadKnownTechnologies() {
        return {
            // Web Technologies
            'react': { category: 'frontend', api: 'npm', repo: 'facebook/react', staticEol: 'No formal EOL (Facebook maintains)', eolPattern: 'Major versions supported ~18 months' },
            'vue': { category: 'frontend', api: 'npm', repo: 'vuejs/vue', staticEol: 'Vue 2: Dec 2023, Vue 3: Active' },
            'angular': { category: 'frontend', api: 'npm', repo: 'angular/angular', staticEol: 'Major versions: 18 months LTS' },
            'next.js': { category: 'frontend', api: 'npm', repo: 'vercel/next.js', npmName: 'next', staticEol: 'Major versions supported ~12-18 months', eolApi: 'nextjs' },
            'nextjs': { category: 'frontend', api: 'npm', repo: 'vercel/next.js', npmName: 'next', staticEol: 'Major versions supported ~12-18 months', eolApi: 'nextjs' },
            'nuxt': { category: 'frontend', api: 'npm', repo: 'nuxt/nuxt', staticEol: 'Nuxt 2: June 2024, Nuxt 3: Active' },
            'svelte': { category: 'frontend', api: 'npm', repo: 'sveltejs/svelte', staticEol: 'Major versions: ~24 months' },
            
            // Backend Technologies
            'node.js': { category: 'runtime', api: 'static', staticVersion: '22.12.0', eolApi: 'nodejs', staticEol: 'Node 18: April 2025, Node 20: April 2026, Node 22: April 2027', checkUrl: 'https://nodejs.org/en/download/releases/' },
            'node': { category: 'runtime', api: 'static', staticVersion: '22.12.0', eolApi: 'nodejs', staticEol: 'Node 18: April 2025, Node 20: April 2026, Node 22: April 2027', checkUrl: 'https://nodejs.org/en/download/releases/' },
            'express': { category: 'backend', api: 'npm', repo: 'expressjs/express', staticEol: 'Active maintenance, no formal EOL' },
            'fastapi': { category: 'backend', api: 'pypi', repo: 'tiangolo/fastapi', staticEol: 'Active development, no formal EOL' },
            'django': { category: 'backend', api: 'pypi', repo: 'django/django', staticEol: 'LTS versions: 3 years support' },
            'flask': { category: 'backend', api: 'pypi', repo: 'pallets/flask', staticEol: 'Active maintenance, no formal EOL' },
            'spring boot': { category: 'backend', api: 'static', staticVersion: '3.3.6', eolApi: 'spring-boot', staticEol: 'Commercial support available, OSS ongoing', checkUrl: 'https://spring.io/projects/spring-boot' },
            
            // Databases
            'postgresql': { category: 'database', api: 'static', staticVersion: '16.6', eolApi: 'postgresql', checkUrl: 'https://www.postgresql.org/download/' },
            'mysql': { category: 'database', api: 'static', staticVersion: '8.4.3', eolApi: 'mysql', checkUrl: 'https://dev.mysql.com/downloads/' },
            'mongodb': { category: 'database', api: 'static', staticVersion: '8.0', eolApi: 'mongodb', checkUrl: 'https://www.mongodb.com/try/download/community' },
            'redis': { category: 'database', api: 'static', staticVersion: '7.4.1', eolApi: 'redis', checkUrl: 'https://redis.io/download/' },
            
            // Languages (using static versions as APIs are unreliable for languages)
            'python': { category: 'language', api: 'static', staticVersion: '3.13.1', eolApi: 'python', staticEol: '2029-10', checkUrl: 'https://www.python.org/downloads/' },
            'java': { category: 'language', api: 'static', staticVersion: '25.0.0', ltsVersion: '25', eolApi: 'java', staticEol: '2033-09', staticSupportEnd: '2030-09', checkUrl: 'https://openjdk.org/projects/jdk/' },
            'go': { category: 'language', api: 'static', staticVersion: '1.23.4', eolApi: 'go', staticEol: 'Rolling release', checkUrl: 'https://golang.org/dl/' },
            'rust': { category: 'language', api: 'static', staticVersion: '1.83.0', staticEol: 'Rolling release (6 week cycle)', checkUrl: 'https://forge.rust-lang.org/channel-releases.html' },
            
            // DevOps & Infrastructure
            'kubernetes': { category: 'orchestration', api: 'static', staticVersion: '1.31.3', eolApi: 'kubernetes', checkUrl: 'https://kubernetes.io/releases/' },
            'docker': { category: 'containerization', api: 'static', staticVersion: '27.3.1', eolApi: 'docker-engine', checkUrl: 'https://docs.docker.com/engine/release-notes/' },
            'nginx': { category: 'webserver', api: 'static', staticVersion: '1.27.3', eolApi: 'nginx', checkUrl: 'http://nginx.org/en/download.html' },
            'elasticsearch': { category: 'search', api: 'static', staticVersion: '8.15.3', eolApi: 'elasticsearch', checkUrl: 'https://www.elastic.co/downloads/elasticsearch' },
            
            // Additional common technologies
            'gradle': { category: 'build', api: 'static', staticVersion: '8.11.1', checkUrl: 'https://gradle.org/releases/' },
            'maven': { category: 'build', api: 'static', staticVersion: '3.9.9', checkUrl: 'https://maven.apache.org/download.cgi' }
        };
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
        const suggestionsContainer = document.getElementById('techSuggestions');
        
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        const matches = Object.keys(this.knownTechnologies)
            .filter(tech => tech.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);

        if (matches.length === 0) {
            this.hideSuggestions();
            return;
        }

        suggestionsContainer.innerHTML = matches
            .map(tech => `<div class="suggestion-item" data-tech="${tech}">${tech}</div>`)
            .join('');
        
        suggestionsContainer.style.display = 'block';

        // Add click handlers
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                document.getElementById('techName').value = item.dataset.tech;
                this.hideSuggestions();
            });
        });
    }

    hideSuggestions() {
        document.getElementById('techSuggestions').style.display = 'none';
    }

    async addTechnology() {
        const techName = document.getElementById('techName').value.trim();
        const currentVersion = document.getElementById('currentVersion').value.trim();
        const environment = document.getElementById('environment').value;

        if (!techName || !currentVersion) {
            this.showError('Please provide both technology name and current version');
            return;
        }

        this.showLoading('Adding and analyzing technology...');

        try {
            const techData = await this.aiAnalyzeTechnology(techName, currentVersion, environment);
            this.techData.push(techData);
            this.saveData();
            this.renderStats();
            this.renderTechCards();
            this.clearForm();
            this.hideLoading();
            
            // Show recommendations if any critical issues found
            if (techData.aiPriority === 'critical') {
                this.showRecommendationForTech(techData);
            }
        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to analyze technology: ${error.message}`);
        }
    }

    async aiAnalyzeTechnology(name, currentVersion, environment) {
        const normalizedName = name.toLowerCase();
        const knownTech = this.knownTechnologies[normalizedName];
        
        const techData = {
            id: Date.now().toString(),
            technology: name,
            currentVersion: currentVersion,
            environment: environment,
            addedDate: new Date().toISOString(),
            lastAnalyzed: new Date().toISOString()
        };

        // Get latest version information
        try {
            const versionInfo = await this.fetchLatestVersion(normalizedName, knownTech);
            techData.latestVersion = versionInfo.latest;
            techData.checkUrl = versionInfo.url;
            
            // Get EOL information
            if (knownTech?.eolApi || knownTech?.staticEol) {
                const eolInfo = await this.fetchEOLInfo(knownTech.eolApi, knownTech, currentVersion);
                techData.eolDate = eolInfo.eol;
                techData.supportStatus = eolInfo.support;
                techData.eolSource = eolInfo.source;
                techData.eolCycle = eolInfo.cycle;
            }

            // AI Analysis
            const aiAnalysis = this.performAIAnalysis(techData, knownTech);
            Object.assign(techData, aiAnalysis);

        } catch (error) {
            console.warn(`Failed to fetch data for ${name}:`, error);
            // Fallback AI analysis with limited data
            const aiAnalysis = this.performAIAnalysis(techData, knownTech);
            Object.assign(techData, aiAnalysis);
        }

        return techData;
    }

    async fetchLatestVersion(techName, knownTech) {
        if (!knownTech) {
            throw new Error('Unknown technology');
        }

        try {
            let url, response, data;

            switch (knownTech.api) {
                case 'static':
                    // Use pre-defined static versions for technologies where APIs are unreliable
                    return {
                        latest: knownTech.staticVersion,
                        url: knownTech.checkUrl || `https://www.google.com/search?q=${encodeURIComponent(techName + ' latest version')}`
                    };

                case 'npm':
                    const npmName = knownTech.npmName || techName;
                    url = `${this.apiEndpoints.npm}/${npmName}/latest`;
                    response = await fetch(url);
                    if (!response.ok) throw new Error(`NPM API failed: ${response.status}`);
                    data = await response.json();
                    return {
                        latest: data.version,
                        url: `https://www.npmjs.com/package/${npmName}`
                    };

                case 'pypi':
                    url = `${this.apiEndpoints.pypi}/${techName}/json`;
                    response = await fetch(url);
                    if (!response.ok) throw new Error(`PyPI API failed: ${response.status}`);
                    data = await response.json();
                    return {
                        latest: data.info.version,
                        url: `https://pypi.org/project/${techName}/`
                    };

                case 'github':
                    url = `${this.apiEndpoints.versions}/${knownTech.repo}/releases/latest`;
                    response = await fetch(url);
                    if (!response.ok) throw new Error(`GitHub API failed: ${response.status}`);
                    data = await response.json();
                    return {
                        latest: data.tag_name.replace(/^v/, ''),
                        url: `https://github.com/${knownTech.repo}/releases`
                    };

                default:
                    throw new Error('Unsupported API');
            }
        } catch (error) {
            // Fallback to static version if available
            if (knownTech.staticVersion) {
                return {
                    latest: knownTech.staticVersion,
                    url: knownTech.checkUrl || `https://www.google.com/search?q=${encodeURIComponent(techName + ' latest version')}`
                };
            }
            
            // Final fallback: try to get info from GitHub if repo is available
            if (knownTech.repo) {
                try {
                    const url = `${this.apiEndpoints.versions}/${knownTech.repo}/releases/latest`;
                    const response = await fetch(url);
                    if (response.ok) {
                        const data = await response.json();
                        return {
                            latest: data.tag_name.replace(/^v/, ''),
                            url: `https://github.com/${knownTech.repo}/releases`
                        };
                    }
                } catch (fallbackError) {
                    console.warn('GitHub fallback failed:', fallbackError);
                }
            }
            throw error;
        }
    }

    async fetchEOLInfo(eolTech, knownTech, currentVersion) {
        // First try static EOL data with version-specific logic
        if (knownTech && currentVersion) {
            const versionSpecificEOL = this.getVersionSpecificEOL(knownTech, currentVersion);
            if (versionSpecificEOL) {
                return versionSpecificEOL;
            }
        }

        // Fallback to general static EOL data if available
        if (knownTech && knownTech.staticEol) {
            return {
                eol: knownTech.staticEol,
                support: knownTech.staticSupportEnd || 'See EOL date',
                lts: knownTech.ltsVersion || false,
                source: 'static'
            };
        }

        // Try the endoflife.date API
        try {
            const response = await fetch(`${this.apiEndpoints.endoflife}/${eolTech}.json`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (Array.isArray(data) && data.length > 0) {
                    // Try to find the specific version
                    let versionData = null;
                    if (currentVersion) {
                        const majorVersion = this.extractMajorVersion(currentVersion);
                        versionData = data.find(v => 
                            v.cycle == majorVersion || 
                            v.cycle == currentVersion ||
                            v.latest?.includes(majorVersion)
                        );
                    }
                    
                    // Fallback to latest if specific version not found
                    const targetData = versionData || data[0];
                    
                    return {
                        eol: targetData.eol || 'Not specified',
                        support: targetData.support || 'Not specified',
                        lts: targetData.lts || false,
                        cycle: targetData.cycle,
                        source: versionData ? 'api-specific' : 'api-latest'
                    };
                }
            }
        } catch (error) {
            console.warn(`Failed to fetch EOL for ${eolTech}:`, error);
        }

        // Fallback: provide technology-specific EOL patterns
        const eolPatterns = {
            'react': 'Major versions supported ~18-24 months by Meta',
            'vue': 'Vue 2 EOL: December 2023, Vue 3: Active',
            'angular': 'Major versions: 18 months LTS support',
            'node': 'LTS versions: 30 months (18 months active + 12 months maintenance)',
            'java': 'Java 8: 2030, Java 11: 2026, Java 17: 2029, Java 21: 2031, Java 25: 2033 (LTS)',
            'python': 'Major versions: ~5 years support',
            'spring-boot': 'OSS: ongoing, Commercial support available',
            'nextjs': 'Major versions: ~12-18 months support'
        };

        const pattern = eolPatterns[eolTech] || knownTech?.eolPattern;
        
        return pattern ? {
            eol: pattern,
            support: 'See documentation',
            lts: false,
            source: 'pattern'
        } : {};
    }

    getVersionSpecificEOL(knownTech, currentVersion) {
        const majorVersion = this.extractMajorVersion(currentVersion);
        const tech = knownTech.category;
        
        // Java version-specific EOL dates
        if (knownTech.eolApi === 'java') {
            const javaEOLMap = {
                '8': { eol: '2030-12', support: '2030-12', lts: true },
                '11': { eol: '2026-09', support: '2024-09', lts: true },
                '17': { eol: '2029-09', support: '2027-09', lts: true },
                '21': { eol: '2031-09', support: '2029-09', lts: true },
                '22': { eol: '2025-03', support: '2025-03', lts: false },
                '23': { eol: '2025-09', support: '2025-09', lts: false },
                '24': { eol: '2026-03', support: '2026-03', lts: false },
                '25': { eol: '2033-09', support: '2031-09', lts: true }
            };
            
            const javaInfo = javaEOLMap[majorVersion];
            if (javaInfo) {
                return {
                    eol: javaInfo.eol,
                    support: javaInfo.support,
                    lts: javaInfo.lts,
                    cycle: `Java ${majorVersion}`,
                    source: 'version-specific'
                };
            }
        }
        
        // Node.js version-specific EOL dates
        if (knownTech.eolApi === 'nodejs') {
            const nodeEOLMap = {
                '16': { eol: '2024-04-30', support: '2023-10-30', lts: true },
                '18': { eol: '2025-04-30', support: '2024-10-30', lts: true },
                '20': { eol: '2026-04-30', support: '2025-10-30', lts: true },
                '21': { eol: '2024-06-01', support: '2024-06-01', lts: false },
                '22': { eol: '2027-04-30', support: '2026-10-30', lts: true },
                '23': { eol: '2024-06-01', support: '2024-06-01', lts: false }
            };
            
            const nodeInfo = nodeEOLMap[majorVersion];
            if (nodeInfo) {
                return {
                    eol: nodeInfo.eol,
                    support: nodeInfo.support,
                    lts: nodeInfo.lts,
                    cycle: `Node.js ${majorVersion}`,
                    source: 'version-specific'
                };
            }
        }

        // Python version-specific EOL dates
        if (knownTech.eolApi === 'python') {
            const pythonEOLMap = {
                '3.8': { eol: '2024-10', support: '2024-10', lts: false },
                '3.9': { eol: '2025-10', support: '2025-10', lts: false },
                '3.10': { eol: '2026-10', support: '2026-10', lts: false },
                '3.11': { eol: '2027-10', support: '2027-10', lts: false },
                '3.12': { eol: '2028-10', support: '2028-10', lts: false },
                '3.13': { eol: '2029-10', support: '2029-10', lts: false }
            };
            
            const pythonInfo = pythonEOLMap[currentVersion] || pythonEOLMap[`3.${majorVersion}`];
            if (pythonInfo) {
                return {
                    eol: pythonInfo.eol,
                    support: pythonInfo.support,
                    lts: pythonInfo.lts,
                    cycle: `Python ${currentVersion}`,
                    source: 'version-specific'
                };
            }
        }

        return null;
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

    performAIAnalysis(techData, knownTech) {
        const analysis = {
            aiPriority: 'medium',
            securityScore: 85,
            stabilityScore: 90,
            recommendations: [],
            nextSteps: [],
            estimatedEffort: 'medium'
        };

        // Version analysis
        const versionAnalysis = this.analyzeVersions(techData.currentVersion, techData.latestVersion);
        analysis.versionGap = versionAnalysis.gap;
        analysis.aiPriority = versionAnalysis.priority;

        // EOL analysis
        if (techData.eolDate) {
            const eolAnalysis = this.analyzeEOL(techData.eolDate);
            if (eolAnalysis.priority === 'critical') {
                analysis.aiPriority = 'critical';
            }
            analysis.recommendations.push(...eolAnalysis.recommendations);
        }

        // Technology-specific insights
        if (knownTech) {
            const techSpecificInsights = this.getTechnologySpecificInsights(techData, knownTech);
            analysis.recommendations.push(...techSpecificInsights.recommendations);
            analysis.nextSteps.push(...techSpecificInsights.nextSteps);
        }

        // Generate next steps
        analysis.nextSteps = this.generateNextSteps(techData, analysis);

        return analysis;
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
                    priority: majorDiff >= 2 ? 'critical' : 'high'
                };
            } else if (minorDiff > 0) {
                return { 
                    gap: `${minorDiff} minor version${minorDiff > 1 ? 's' : ''} behind`,
                    priority: minorDiff >= 5 ? 'high' : 'medium'
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

    analyzeEOL(eolDate) {
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

    getTechnologySpecificInsights(techData, knownTech) {
        const insights = {
            recommendations: [],
            nextSteps: []
        };

        switch (knownTech.category) {
            case 'frontend':
                insights.recommendations.push(
                    '🎨 Consider performance impact of framework updates',
                    '📱 Ensure mobile compatibility with new version',
                    '🧪 Test component rendering thoroughly'
                );
                insights.nextSteps.push(
                    'Review breaking changes in release notes',
                    'Update development dependencies',
                    'Run comprehensive testing suite'
                );
                break;

            case 'backend':
                insights.recommendations.push(
                    '🔒 Review security patches in newer versions',
                    '📊 Monitor performance after upgrade',
                    '🔄 Plan for backward compatibility'
                );
                insights.nextSteps.push(
                    'Set up staging environment testing',
                    'Review API compatibility',
                    'Plan gradual rollout strategy'
                );
                break;

            case 'database':
                insights.recommendations.push(
                    '💾 Backup data before upgrade',
                    '🔄 Test migration scripts',
                    '📈 Monitor query performance post-upgrade'
                );
                insights.nextSteps.push(
                    'Schedule maintenance window',
                    'Prepare rollback plan',
                    'Test backup restoration'
                );
                break;

            case 'language':
                if (techData.technology.toLowerCase().includes('java')) {
                    const currentMajor = parseInt(techData.currentVersion);
                    const latestMajor = parseInt(techData.latestVersion || '25');
                    
                    if (currentMajor < 25) {
                        insights.recommendations.push(
                            '☕ Java 25 is the current LTS - consider upgrading for long-term support',
                            '⚡ Virtual threads and pattern matching improvements available',
                            '� Enhanced security and performance optimizations'
                        );
                        insights.nextSteps.push(
                            'Review Java 25 LTS migration guide',
                            'Test application with Java 25',
                            'Update build tools and dependencies',
                            'Plan LTS upgrade timeline'
                        );
                    } else if (currentMajor === 25) {
                        insights.recommendations.push(
                            '✅ You\'re on Java 25 LTS - excellent choice for production',
                            '🔄 Monitor for patch updates within Java 25',
                            '📚 Consider exploring newer Java features in development'
                        );
                    } else {
                        insights.recommendations.push(
                            '🆕 You\'re on a newer Java version - consider LTS for production stability',
                            '📊 Evaluate if cutting-edge features justify non-LTS version',
                            '🔄 Plan migration path to next LTS when available'
                        );
                    }
                } else {
                    insights.recommendations.push(
                        '�🔧 Check dependency compatibility',
                        '📚 Review deprecated features',
                        '⚡ Leverage new performance improvements'
                    );
                    insights.nextSteps.push(
                        'Audit codebase for deprecated features',
                        'Update CI/CD pipeline',
                        'Train team on new features'
                    );
                }
                break;

            case 'runtime':
                if (techData.technology.toLowerCase().includes('node')) {
                    insights.recommendations.push(
                        '🔒 Node.js security updates are critical',
                        '⚡ Performance improvements in newer versions',
                        '📦 Check npm ecosystem compatibility'
                    );
                    insights.nextSteps.push(
                        'Review Node.js release notes',
                        'Test with updated npm packages',
                        'Update deployment configurations'
                    );
                }
                break;

            default:
                insights.recommendations.push(
                    '🔍 Review technology-specific release notes',
                    '🧪 Test in development environment first',
                    '📊 Monitor system metrics after upgrade'
                );
                break;
        }

        return insights;
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
        if (this.techData.length === 0) {
            this.showError('No technologies to analyze. Add some technologies first.');
            return;
        }

        this.showLoading('AI is analyzing all technologies...');

        try {
            const updatedData = [];
            
            for (const tech of this.techData) {
                const updated = await this.aiAnalyzeTechnology(
                    tech.technology, 
                    tech.currentVersion, 
                    tech.environment
                );
                updated.id = tech.id; // Preserve ID
                updatedData.push(updated);
                
                // Update loading steps
                this.updateLoadingStep();
                await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
            }

            this.techData = updatedData;
            this.saveData();
            this.renderStats();
            this.renderTechCards();
            this.hideLoading();
            
            // Generate overall recommendations
            this.generateOverallRecommendations();
            
        } catch (error) {
            this.hideLoading();
            this.showError(`AI analysis failed: ${error.message}`);
        }
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
        return {
            critical: this.techData.filter(t => t.aiPriority === 'critical').length,
            recommended: this.techData.filter(t => t.aiPriority === 'high' || t.aiPriority === 'medium').length,
            upToDate: this.techData.filter(t => t.aiPriority === 'low' || t.versionGap === 'up-to-date').length,
            aiInsights: this.techData.filter(t => t.recommendations && t.recommendations.length > 0).length
        };
    }

    renderTechCards() {
        const container = document.getElementById('techGrid');
        container.innerHTML = '';

        if (this.techData.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-robot" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="font-size: 1.2rem;">No technologies added yet.</p>
                    <p>Add a technology above to get started with AI analysis!</p>
                </div>
            `;
            return;
        }

        this.techData.forEach((item, index) => {
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
                    ${item.environment ? `<span class="env-badge">${item.environment}</span>` : ''}
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
        }
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

        this.showLoading(`Generating detailed upgrade plan for ${tech.technology}...`);

        try {
            const upgradePlan = await this.generateDetailedUpgradePlan(tech);
            this.hideLoading();
            this.displayUpgradePlanModal(tech, upgradePlan);
        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to generate upgrade plan: ${error.message}`);
        }
    }

    async generateDetailedUpgradePlan(tech) {
        const fromVersion = tech.currentVersion;
        const toVersion = tech.latestVersion;
        const techName = tech.technology.toLowerCase();

        // Generate comprehensive upgrade plan based on technology
        const plan = {
            overview: '',
            timeline: '',
            phases: [],
            risks: [],
            testing: [],
            rollback: [],
            resources: [],
            industryBestPractices: [],
            microservicesConsiderations: []
        };

        if (techName.includes('java')) {
            return this.generateJavaUpgradePlan(fromVersion, toVersion, tech);
        } else if (techName.includes('node')) {
            return this.generateNodeUpgradePlan(fromVersion, toVersion, tech);
        } else if (techName.includes('react')) {
            return this.generateReactUpgradePlan(fromVersion, toVersion, tech);
        } else if (techName.includes('spring')) {
            return this.generateSpringUpgradePlan(fromVersion, toVersion, tech);
        } else if (techName.includes('python')) {
            return this.generatePythonUpgradePlan(fromVersion, toVersion, tech);
        } else {
            return this.generateGenericUpgradePlan(fromVersion, toVersion, tech);
        }
    }

    generateJavaUpgradePlan(fromVersion, toVersion, tech) {
        const fromMajor = parseInt(fromVersion);
        const toMajor = parseInt(toVersion);

        return {
            overview: `Comprehensive Java ${fromVersion} → ${toVersion} upgrade plan for distributed microservices architecture. This upgrade brings significant performance improvements, new language features, and long-term support benefits.`,
            
            timeline: `Estimated timeline: 8-12 weeks for complete migration across all microservices`,
            
            phases: [
                {
                    name: 'Phase 1: Environment Preparation (Week 1-2)',
                    tasks: [
                        'Set up Java 21 development environments for all developers',
                        'Update CI/CD pipelines to support Java 21',
                        'Create isolated staging environment with Java 21',
                        'Audit all dependencies for Java 21 compatibility',
                        'Update build tools (Maven/Gradle) to latest versions',
                        'Test basic application startup in new environment'
                    ]
                },
                {
                    name: 'Phase 2: Dependency & Code Analysis (Week 2-3)',
                    tasks: [
                        'Run dependency compatibility checks using Maven/Gradle plugins',
                        'Identify deprecated APIs and language features',
                        'Review third-party library versions and update plans',
                        'Analyze performance-critical code for optimization opportunities',
                        'Create migration checklist for each microservice',
                        'Document breaking changes and required code modifications'
                    ]
                },
                {
                    name: 'Phase 3: Pilot Service Migration (Week 4-5)',
                    tasks: [
                        'Select least critical microservice as pilot',
                        'Perform complete migration of pilot service',
                        'Implement comprehensive testing suite for pilot',
                        'Monitor performance metrics and memory usage',
                        'Validate inter-service communication works correctly',
                        'Document lessons learned and refine process'
                    ]
                },
                {
                    name: 'Phase 4: Core Services Migration (Week 6-8)',
                    tasks: [
                        'Migrate core business logic services in priority order',
                        'Implement blue-green deployment strategy',
                        'Run parallel testing (old vs new Java versions)',
                        'Monitor application performance and error rates',
                        'Validate database connections and persistence layers',
                        'Test service mesh and load balancing configurations'
                    ]
                },
                {
                    name: 'Phase 5: Full Production Rollout (Week 9-12)',
                    tasks: [
                        'Complete migration of remaining services',
                        'Perform end-to-end system testing',
                        'Conduct load testing and performance validation',
                        'Execute disaster recovery procedures',
                        'Monitor production metrics for 2 weeks',
                        'Decommission old Java 17 environments'
                    ]
                }
            ],
            
            risks: [
                {
                    risk: 'Service compatibility issues between Java versions',
                    mitigation: 'Implement version-agnostic APIs and maintain backward compatibility during transition'
                },
                {
                    risk: 'Memory usage changes affecting container resource allocation',
                    mitigation: 'Perform memory profiling and adjust Kubernetes resource limits accordingly'
                },
                {
                    risk: 'Third-party library incompatibilities',
                    mitigation: 'Test all integrations in isolation and have rollback plans for each service'
                },
                {
                    risk: 'Performance regressions in production',
                    mitigation: 'Implement comprehensive monitoring and automated rollback triggers'
                }
            ],
            
            testing: [
                'Unit tests with both Java 17 and 21 (parallel testing)',
                'Integration testing across all microservice boundaries',
                'Performance benchmarking (latency, throughput, memory)',
                'Load testing with production-like traffic patterns',
                'Chaos engineering to test failure scenarios',
                'Security testing for new Java 21 features',
                'End-to-end user journey testing'
            ],
            
            rollback: [
                'Maintain Java 17 container images as backup',
                'Implement feature flags for gradual rollout',
                'Use blue-green deployment with instant switchback capability',
                'Database schema compatibility maintained during transition',
                'Automated monitoring triggers for performance degradation',
                'Pre-approved rollback procedures for each service tier'
            ],
            
            resources: [
                'Oracle Java 21 Migration Guide: https://docs.oracle.com/en/java/javase/21/migrate/',
                'Spring Boot 3.x Java 21 compatibility guide',
                'Micrometer metrics for Java 21 performance monitoring',
                'Docker base images: openjdk:21-jre-slim',
                'Gradle/Maven plugins for Java 21 compatibility checking'
            ],
            
            industryBestPractices: [
                '🏢 Netflix: Gradual rollout using canary deployments with 1% → 10% → 50% → 100% traffic',
                '🏢 Spotify: Service-by-service migration with comprehensive A/B testing',
                '🏢 Uber: Blue-green deployment with automated performance validation',
                '🏢 LinkedIn: Parallel running environments for 2 weeks before cutover',
                '🏢 Amazon: Feature flags for gradual enablement of Java 21 features',
                '🏢 Google: Extensive integration testing with downstream services',
                '🚀 Key Learning: Always migrate non-critical services first to validate process'
            ],
            
            microservicesConsiderations: [
                {
                    aspect: 'Service Discovery',
                    consideration: 'Ensure service discovery works with both Java versions during transition',
                    action: 'Test Consul/Eureka compatibility and update health check endpoints'
                },
                {
                    aspect: 'Circuit Breakers',
                    consideration: 'Monitor circuit breaker patterns for changes in service behavior',
                    action: 'Adjust Hystrix/Resilience4j timeouts based on Java 21 performance characteristics'
                },
                {
                    aspect: 'Distributed Tracing',
                    consideration: 'Validate tracing continues to work across version boundaries',
                    action: 'Update Zipkin/Jaeger configurations for Java 21 virtual threads'
                },
                {
                    aspect: 'Container Orchestration',
                    consideration: 'Kubernetes resource requests/limits may need adjustment',
                    action: 'Monitor memory and CPU usage patterns, update pod specifications'
                },
                {
                    aspect: 'API Gateway',
                    consideration: 'Load balancing between different Java versions during migration',
                    action: 'Configure weighted routing in Kong/Zuul for gradual traffic shift'
                },
                {
                    aspect: 'Data Consistency',
                    consideration: 'Ensure database connections and transactions work consistently',
                    action: 'Test connection pooling and transaction boundaries across services'
                }
            ]
        };
    }

    generateNodeUpgradePlan(fromVersion, toVersion, tech) {
        return {
            overview: `Node.js ${fromVersion} → ${toVersion} migration plan for microservices architecture with focus on performance gains and security improvements.`,
            timeline: `Estimated timeline: 6-8 weeks for complete ecosystem migration`,
            phases: [
                {
                    name: 'Phase 1: Dependency Analysis (Week 1)',
                    tasks: [
                        'Audit npm packages for Node.js compatibility',
                        'Update package.json engines field',
                        'Test critical dependencies in Node.js environment',
                        'Review native modules for rebuild requirements'
                    ]
                },
                {
                    name: 'Phase 2: Development Environment (Week 2-3)',
                    tasks: [
                        'Update Docker base images to Node.js',
                        'Configure CI/CD pipelines for new Node version',
                        'Update local development environments',
                        'Test application startup and basic functionality'
                    ]
                },
                {
                    name: 'Phase 3: Service Migration (Week 4-6)',
                    tasks: [
                        'Migrate services in dependency order',
                        'Implement blue-green deployment',
                        'Monitor performance metrics',
                        'Validate inter-service communication'
                    ]
                },
                {
                    name: 'Phase 4: Production Deployment (Week 7-8)',
                    tasks: [
                        'Full production rollout',
                        'Performance monitoring and optimization',
                        'Security audit and testing',
                        'Documentation and team training'
                    ]
                }
            ],
            risks: [
                { risk: 'npm package incompatibilities', mitigation: 'Comprehensive dependency testing and fallback versions' },
                { risk: 'Native module compilation issues', mitigation: 'Pre-compile modules and test on target architecture' },
                { risk: 'Performance characteristics changes', mitigation: 'Extensive load testing and monitoring' }
            ],
            testing: ['Unit tests with new Node.js version', 'npm audit for security vulnerabilities', 'Load testing with realistic traffic'],
            rollback: ['Maintain previous Node.js container images', 'Feature flags for gradual rollout', 'Automated rollback triggers'],
            resources: ['Node.js migration guide', 'npm compatibility checker', 'Performance monitoring tools'],
            industryBestPractices: [
                '🏢 Airbnb: Gradual migration with comprehensive testing',
                '🏢 WhatsApp: Blue-green deployment with instant rollback',
                '🏢 PayPal: Service-by-service approach with monitoring'
            ],
            microservicesConsiderations: [
                { aspect: 'Event Loop', consideration: 'Monitor event loop lag in new version', action: 'Update monitoring dashboards' },
                { aspect: 'Memory Usage', consideration: 'V8 engine changes may affect memory patterns', action: 'Adjust container limits' }
            ]
        };
    }

    generateReactUpgradePlan(fromVersion, toVersion, tech) {
        return {
            overview: `React ${fromVersion} → ${toVersion} upgrade focusing on modern features and performance improvements in micro-frontend architecture.`,
            timeline: `Estimated timeline: 4-6 weeks for complete frontend migration`,
            phases: [
                {
                    name: 'Phase 1: Preparation (Week 1)',
                    tasks: [
                        'Audit component library for breaking changes',
                        'Update build tools and webpack configuration',
                        'Review React Router and state management compatibility',
                        'Test critical user flows in new React version'
                    ]
                },
                {
                    name: 'Phase 2: Component Migration (Week 2-3)',
                    tasks: [
                        'Migrate shared components first',
                        'Update hooks and lifecycle methods',
                        'Test component rendering and performance',
                        'Validate micro-frontend integration points'
                    ]
                },
                {
                    name: 'Phase 3: Feature Testing (Week 4)',
                    tasks: [
                        'End-to-end testing of all features',
                        'Performance testing and optimization',
                        'Cross-browser compatibility testing',
                        'Accessibility audit'
                    ]
                },
                {
                    name: 'Phase 4: Production Deployment (Week 5-6)',
                    tasks: [
                        'Canary deployment to subset of users',
                        'Monitor user metrics and error rates',
                        'Full production rollout',
                        'Performance monitoring and optimization'
                    ]
                }
            ],
            risks: [
                { risk: 'Component breaking changes', mitigation: 'Comprehensive component testing and fallback implementations' },
                { risk: 'Bundle size increases', mitigation: 'Bundle analysis and tree-shaking optimization' },
                { risk: 'Performance regressions', mitigation: 'React DevTools profiling and optimization' }
            ],
            testing: ['Component unit tests', 'Integration testing', 'Visual regression testing', 'Performance benchmarking'],
            rollback: ['Previous build artifacts maintained', 'Feature flags for component switching', 'CDN rollback capability'],
            resources: ['React migration guide', 'React DevTools', 'Bundle analyzer tools'],
            industryBestPractices: [
                '🏢 Facebook: Incremental migration with codemods',
                '🏢 Netflix: Feature flag driven rollout',
                '🏢 Spotify: Micro-frontend approach for gradual migration'
            ],
            microservicesConsiderations: [
                { aspect: 'Micro-frontends', consideration: 'Ensure compatibility across micro-frontend boundaries', action: 'Test module federation' },
                { aspect: 'State Management', consideration: 'Redux/Context API changes', action: 'Validate state synchronization' }
            ]
        };
    }

    generateGenericUpgradePlan(fromVersion, toVersion, tech) {
        return {
            overview: `${tech.technology} upgrade from ${fromVersion} to ${toVersion} with focus on distributed systems best practices.`,
            timeline: `Estimated timeline: 6-10 weeks depending on complexity`,
            phases: [
                {
                    name: 'Phase 1: Analysis & Planning (Week 1-2)',
                    tasks: [
                        'Analyze current usage and dependencies',
                        'Review release notes and breaking changes',
                        'Plan migration strategy',
                        'Set up test environments'
                    ]
                },
                {
                    name: 'Phase 2: Development & Testing (Week 3-5)',
                    tasks: [
                        'Implement changes in development environment',
                        'Update configurations and dependencies',
                        'Comprehensive testing',
                        'Performance validation'
                    ]
                },
                {
                    name: 'Phase 3: Production Deployment (Week 6-8)',
                    tasks: [
                        'Staged production rollout',
                        'Monitor system metrics',
                        'Validate functionality',
                        'Full deployment completion'
                    ]
                }
            ],
            risks: [
                { risk: 'Compatibility issues', mitigation: 'Thorough testing and rollback plans' },
                { risk: 'Performance impacts', mitigation: 'Monitoring and optimization' }
            ],
            testing: ['Functional testing', 'Performance testing', 'Integration testing'],
            rollback: ['Previous version backup', 'Rollback procedures', 'Monitoring triggers'],
            resources: ['Official documentation', 'Community guides', 'Support channels'],
            industryBestPractices: [
                '🏢 Industry standard: Phased rollout approach',
                '🏢 Best practice: Comprehensive testing strategy',
                '🏢 Recommendation: Monitoring and observability'
            ],
            microservicesConsiderations: [
                { aspect: 'Service Integration', consideration: 'Ensure service boundaries remain intact', action: 'Test all integrations' },
                { aspect: 'Deployment', consideration: 'Coordinate deployment across services', action: 'Use deployment orchestration' }
            ]
        };
    }

    generateSpringUpgradePlan(fromVersion, toVersion, tech) {
        return {
            overview: `Spring Boot ${fromVersion} → ${toVersion} enterprise migration plan for microservices ecosystem with focus on reactive programming and performance.`,
            timeline: `Estimated timeline: 10-14 weeks for enterprise-grade migration`,
            phases: [
                {
                    name: 'Phase 1: Framework Analysis (Week 1-2)',
                    tasks: [
                        'Audit Spring dependencies and compatibility matrix',
                        'Review configuration changes and deprecated features',
                        'Analyze security framework updates',
                        'Test data access layer compatibility'
                    ]
                },
                {
                    name: 'Phase 2: Core Services Migration (Week 3-6)',
                    tasks: [
                        'Migrate shared libraries and common components',
                        'Update Spring Security configurations',
                        'Migrate data access patterns to new version',
                        'Test reactive programming enhancements'
                    ]
                },
                {
                    name: 'Phase 3: Service Integration (Week 7-10)',
                    tasks: [
                        'Migrate business services in dependency order',
                        'Update service discovery and configuration',
                        'Test distributed tracing and monitoring',
                        'Validate API gateway integration'
                    ]
                },
                {
                    name: 'Phase 4: Production Rollout (Week 11-14)',
                    tasks: [
                        'Canary deployment with traffic splitting',
                        'Monitor application metrics and performance',
                        'Validate security and compliance requirements',
                        'Complete production migration'
                    ]
                }
            ],
            risks: [
                { risk: 'Spring Security breaking changes', mitigation: 'Comprehensive security testing and configuration validation' },
                { risk: 'Data access layer changes', mitigation: 'Database integration testing and transaction boundary validation' },
                { risk: 'Actuator endpoint changes', mitigation: 'Update monitoring and health check configurations' }
            ],
            testing: ['Spring Boot Test slices', 'Integration testing with TestContainers', 'Security testing', 'Performance benchmarking'],
            rollback: ['Previous Spring Boot artifacts', 'Database migration rollback scripts', 'Configuration rollback procedures'],
            resources: ['Spring Boot Migration Guide', 'Spring Security documentation', 'Spring Cloud compatibility matrix'],
            industryBestPractices: [
                '🏢 Pivotal/VMware: Service-by-service migration approach',
                '🏢 Netflix: Eureka and Hystrix integration patterns',
                '🏢 Zalando: API-first approach with Spring Cloud Gateway'
            ],
            microservicesConsiderations: [
                { aspect: 'Service Discovery', consideration: 'Spring Cloud service registry changes', action: 'Update Eureka/Consul configuration' },
                { aspect: 'Configuration Management', consideration: 'Spring Cloud Config server compatibility', action: 'Test configuration refresh mechanisms' },
                { aspect: 'Circuit Breakers', consideration: 'Hystrix to Resilience4j migration', action: 'Update circuit breaker patterns' }
            ]
        };
    }

    generatePythonUpgradePlan(fromVersion, toVersion, tech) {
        return {
            overview: `Python ${fromVersion} → ${toVersion} migration plan for distributed microservices with focus on performance improvements and new language features.`,
            timeline: `Estimated timeline: 8-10 weeks for complete ecosystem migration`,
            phases: [
                {
                    name: 'Phase 1: Environment Setup (Week 1-2)',
                    tasks: [
                        'Set up Python virtual environments for new version',
                        'Audit requirements.txt for package compatibility',
                        'Test critical dependencies and frameworks',
                        'Update CI/CD pipelines for new Python version'
                    ]
                },
                {
                    name: 'Phase 2: Code Migration (Week 3-5)',
                    tasks: [
                        'Run 2to3 or pyupgrade for syntax updates',
                        'Update deprecated function calls and imports',
                        'Test async/await patterns and asyncio changes',
                        'Validate type hints and mypy compatibility'
                    ]
                },
                {
                    name: 'Phase 3: Service Testing (Week 6-7)',
                    tasks: [
                        'Unit and integration testing with new Python version',
                        'Performance benchmarking and optimization',
                        'Test web framework compatibility (Django/Flask/FastAPI)',
                        'Validate database drivers and ORM compatibility'
                    ]
                },
                {
                    name: 'Phase 4: Production Deployment (Week 8-10)',
                    tasks: [
                        'Container image updates with new Python version',
                        'Blue-green deployment across microservices',
                        'Monitor application performance and memory usage',
                        'Complete production migration and cleanup'
                    ]
                }
            ],
            risks: [
                { risk: 'Package incompatibilities', mitigation: 'Pin package versions and test extensively' },
                { risk: 'Performance characteristics changes', mitigation: 'Benchmark critical code paths' },
                { risk: 'Breaking changes in standard library', mitigation: 'Comprehensive testing and code review' }
            ],
            testing: ['pytest with new Python version', 'tox for multi-version testing', 'Performance profiling', 'Security scanning'],
            rollback: ['Previous Python container images', 'Virtual environment snapshots', 'Package requirement locks'],
            resources: ['Python migration guide', 'What\'s New in Python documentation', 'PyPI compatibility checker'],
            industryBestPractices: [
                '🏢 Instagram: Gradual migration with extensive A/B testing',
                '🏢 Dropbox: Service-by-service approach with monitoring',
                '🏢 Pinterest: Blue-green deployment with automated rollback'
            ],
            microservicesConsiderations: [
                { aspect: 'WSGI/ASGI', consideration: 'Web server compatibility with new Python version', action: 'Test Gunicorn/uWSGI configurations' },
                { aspect: 'Message Queues', consideration: 'Celery and RabbitMQ/Redis compatibility', action: 'Validate async task processing' },
                { aspect: 'Database Connections', consideration: 'SQLAlchemy and database driver updates', action: 'Test connection pooling and migrations' }
            ]
        };
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
                        <p>${plan.overview}</p>
                        <div class="timeline-badge">
                            <i class="fas fa-clock"></i>
                            ${plan.timeline}
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
                            ${plan.testing.map(test => `<li>${test}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-rollback">
                        <h3>🔄 Rollback Strategy</h3>
                        <ul>
                            ${plan.rollback.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-industry">
                        <h3>🏢 Industry Best Practices</h3>
                        <ul>
                            ${plan.industryBestPractices.map(practice => `<li>${practice}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="plan-microservices">
                        <h3>🔧 Microservices Considerations</h3>
                        ${plan.microservicesConsiderations.map(consideration => `
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
                            ${plan.resources.map(resource => `<li>${resource}</li>`).join('')}
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
        this.showSuccess('All technologies have been removed successfully.');
        
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
}

// Global instance
let aiManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    aiManager = new AITechStackManager();
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