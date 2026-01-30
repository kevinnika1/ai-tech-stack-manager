# 🤖 AI-Powered Tech Stack Manager

An intelligent, product-centric technology stack management application with AI-powered analysis and automated version tracking. Organize and analyze your technology stacks by product or project for comprehensive upgrade planning and risk assessment.

## 🚀 Key Features

### 🏢 **Product-Based Organization**
- **Multi-Product Support**: Organize technologies by product, project, or team (e.g., Nexus, NDC, Core Platform)
- **Tab-Based Interface**: Clean, intuitive product switching with visual organization
- **Product-Specific Analysis**: AI analysis and insights tailored to each product's tech stack
- **Isolated Management**: Changes to one product don't affect others

### 🧠 **AI-Powered Analysis**
- **Local AI Integration**: Supports Ollama for private, on-premise AI analysis
- **Intelligent Technology Recognition**: Automatically detects and analyzes 50+ technologies
- **Version Fetching**: Real-time version checking from npm, PyPI, GitHub releases, and more
- **Smart Recommendations**: AI-generated upgrade suggestions and priority assessments
- **Product-Scoped Insights**: Analysis results specific to each product's context

### 📊 **Enterprise Dashboard**
- **Product Tabs**: Visual organization with active product highlighting
- **Real-time Statistics**: Live counts and health metrics per product
- **Advanced Analytics**: Comprehensive statistics with risk breakdowns by product
- **Interactive Visualizations**: Modern, responsive interface with dark/light themes
- **Cross-Product Overview**: Quick switching between different product stacks

### 🛠️ **Detailed Upgrade Planning**
- **Industry Best Practices**: Migration strategies from enterprise environments
- **Product-Specific Plans**: Tailored upgrade paths for each product's requirements
- **Phase-by-Phase Timelines**: Detailed migration schedules with risk assessment
- **Rollback Strategies**: Comprehensive safety measures for production environments

### 🔧 **Advanced Capabilities**
- **EOL Tracking**: End-of-life monitoring for Java, Node.js, Python, React, and more
- **Technology Database**: 50+ pre-configured technologies with version patterns
- **Product Field Required**: Ensures proper organization and tracking
- **Auto-save**: Local storage with session persistence

## 🎯 Perfect For

- **Multi-Product Organizations** managing diverse technology portfolios
- **Enterprise Development Teams** with separate product lines or business units
- **DevOps Engineers** planning infrastructure upgrades across products
- **Technical Architects** making technology decisions per product context
- **Engineering Managers** tracking technical debt and risks by product
- **Security Teams** monitoring EOL and vulnerability status across the portfolio

## 🌐 Live Demo

[🚀 View AI Tech Stack Manager](https://yourusername.github.io/tech-stack/)

## 📋 Quick Start

1. **Add Technologies**: Enter technology name, current version, and **product name**
2. **Product Organization**: Use tabs to switch between different products (Nexus, NDC, etc.)
3. **AI Analysis**: Click "AI Analysis" to analyze only the current product's technologies
4. **View Insights**: Get intelligent recommendations specific to each product
5. **Product-Specific Planning**: Get tailored upgrade strategies for each product's context
6. **Export/Import**: Save and share your tech stack data with product organization

## 🤖 AI Capabilities

### Automatic Version Detection
The AI system automatically recognizes and fetches the latest stable versions for:

- **Languages**: Java, Python, Node.js, Go, Rust, PHP
- **Frameworks**: React, Vue, Angular, Spring Boot, Django, Express
- **Databases**: PostgreSQL, MongoDB, Redis, MySQL
- **DevOps**: Kubernetes, Docker, Nginx, Jenkins
- **And 40+ more technologies...**

### Intelligent Recommendations
- **Security Alerts**: Immediate warnings for EOL technologies
- **Performance Insights**: Upgrade benefits and optimization opportunities  
- **Best Practices**: Industry-standard approaches from major tech companies
- **Timeline Estimation**: Realistic migration schedules based on complexity
- **Product Context**: Recommendations tailored to each product's specific needs

### Product-Aware Analysis
- **Isolated Processing**: Each product's analysis is completely separate
- **Context-Specific Insights**: Recommendations consider product-specific constraints
- **Targeted Planning**: Migration strategies adapted to product requirements
- **Risk Assessment**: Product-level risk evaluation and prioritization

## 🏗️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES2020+
- **APIs**: npm registry, PyPI, GitHub releases, endoflife.date
- **AI Integration**: Ollama support for local AI analysis
- **Storage**: localStorage for client-side persistence with product organization
- **Deployment**: Static hosting compatible, zero build process
- **Themes**: CSS custom properties with dark/light mode
- **Architecture**: Product-centric data model with tab-based interface

## 📱 Responsive Design

- **Desktop**: Full-featured dashboard with detailed views
- **Tablet**: Optimized layout with touch-friendly controls
- **Mobile**: Streamlined interface for on-the-go monitoring

## 🚀 Deployment

### GitHub Pages (Recommended)
1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Set source to "Deploy from a branch" → main
4. Access at `https://yourusername.github.io/tech-stack/`

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/tech-stack.git
cd tech-stack

# Start local server
python -m http.server 8080
# or
npx serve .

# Open browser
open http://localhost:8080
```

## 📖 Usage Guide

### Adding Technologies
1. Click the "+" card in the dashboard
2. Enter technology name (e.g., "java", "react", "kubernetes")
3. Specify current version (e.g., "17", "18.2.0", "1.28")
4. **Enter Product Name** (e.g., "Nexus", "NDC", "Core Platform")
5. Click "Add Technology" to add to the current product

### Product Management
- **Switch Products**: Click product tabs to view different tech stacks
- **Product-Specific Stats**: Each tab shows statistics for that product only
- **Isolated Analysis**: AI analysis only affects the currently selected product
- **Visual Organization**: Active product highlighted with blue styling

### Understanding Priority Levels
- 🔴 **Critical**: EOL within 6 months or major security concerns
- 🟡 **High**: EOL within 12 months or significant updates available  
- 🔵 **Medium**: Minor updates available, stable current version
- 🟢 **Low**: Up-to-date with latest stable version

### Export/Import Data
- **Export**: Download your tech stack as JSON or CSV
- **Import**: Upload previously exported files
- **Sharing**: Share configurations across teams and projects

## 🤝 Contributing

We welcome contributions! Areas of focus:

- **New Technology Patterns**: Add support for additional technologies
- **API Integrations**: Enhance version checking capabilities  
- **Upgrade Plans**: Contribute migration strategies and best practices
- **UI/UX**: Improve interface and user experience

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **endoflife.date** for comprehensive EOL data
- **npm**, **PyPI**, **GitHub** APIs for version information
- **Font Awesome** for beautiful icons
- **Industry Leaders** for sharing migration best practices

---

TODO: vulnerability security stuff improve and refine prompts and try better LOcal AI models. And refine the defining of criticallity logic more ect.. And make it look nicer. 