DAWSheet Proxy UI

Location

- HTML: src/main/resources/public/ui/index.html
- JS: src/main/resources/public/ui/assets/js/app.js
- Sass: src/main/resources/public/ui/assets/scss/styles.scss
- CSS: src/main/resources/public/ui/assets/css/styles.css

Sass (optional)

- Requires Node.js and npm.
- Install: npm install
- Build once: npm run sass:build
- Watch: npm run sass:watch

Gradle wrappers (optional)

- gradlew sassBuild (runs `npm run sass:build`, ignores if npm missing)
- gradlew sassWatch (runs `npm run sass:watch`)

Notes

- The CSS file is checked in so the UI works without Sass.
- Edit styles.scss and rebuild to update styles.css.
