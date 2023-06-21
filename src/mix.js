const mix = require('laravel-mix')
const fs = require('node:fs')
const { execSync } = require('node:child_process')
const chalk = require('chalk')
const { argv } = require('yargs')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

const pkg = require('../package.json')
const { useConsole } = require('./utils/useConsole.js')
const getRelativePath = require('./utils/getRelativePath.js')
const { UnpluginAutoImports } = require('./config/imports.js')
const {
  absoluteVulmixPaths,
  relativeVulmixPaths,
  isDevMode,
} = require('./config/paths.js')
const { VulmixAliases } = require('./config/aliases')
const { useProjectFolderListener } = require('./utils/useProjectFolderListener')

require('laravel-mix-ejs')

const RELATIVE_ROOT_PATH = relativeVulmixPaths().relativeRootPath
const ABSOLUTE_ROOT_PATH = absoluteVulmixPaths().absoluteRootPath
const RELATIVE_PUBLIC_PATH = relativeVulmixPaths().relativePublicPath
const ABSOLUTE_PACKAGE_PATH = absoluteVulmixPaths().absolutePackagePath
const RELATIVE_PACKAGE_PATH = relativeVulmixPaths().relativePackagePath
const ABSOLUTE_PUBLIC_PATH = absoluteVulmixPaths().absolutePublicPath

const vulmix = {
  globals: {
    rootPath: ABSOLUTE_ROOT_PATH,
  },
}

class VulmixInit {
  name() {
    return 'vulmix'
  }

  register() {
    const VULMIX_CONFIG_PATH = `${ABSOLUTE_ROOT_PATH}/.vulmix/vulmix.config.js`

    const VulmixConfig = require(VULMIX_CONFIG_PATH).default

    useConsole.clear()
    useConsole.log(
      `${chalk.grey(`Vulmix ${pkg.version}`)}\n${chalk.blueBright(
        'Warming up...'
      )}`
    )

    mix.options({
      hmrOptions: {
        host: 'localhost',
        port: argv.port,
      },
    })

    mix
      .before(() => {
        if (!isDevMode) {
          if (!fs.existsSync(`${ABSOLUTE_ROOT_PATH}/vercel.json`)) {
            mix.copy(
              `${ABSOLUTE_PACKAGE_PATH}/utils/deploy/vercel.json`,
              ABSOLUTE_ROOT_PATH
            )
          }
        }
      })

      .webpackConfig({
        plugins: [
          ...UnpluginAutoImports(),
          ...(VulmixConfig.webpackConfig?.plugins || []),
          new ForkTsCheckerWebpackPlugin(),
        ],

        resolve: {
          extensions: ['.js', '.vue', '.ts'],
          alias: {
            ...VulmixAliases(),
            ...(VulmixConfig.webpackConfig?.resolve?.alias || {}),
          },
        },

        module: {
          rules: [
            // ... other rules omitted
            {
              test: /\.ts$/,
              loader: 'ts-loader',
              options: { appendTsSuffixTo: [/\.vue$/] },
            },
          ],
        },
      })

      .vue({ version: 3 })

      .version()

      .extract()

      .disableSuccessNotifications()

    /**
     * Production mode only
     */
    if (mix.inProduction()) {
      fs.rmSync(`${ABSOLUTE_ROOT_PATH}/_dist/assets`, {
        recursive: true,
        force: true,
      })

      if (!fs.existsSync(`${ABSOLUTE_ROOT_PATH}/_dist/assets/img`)) {
        fs.mkdirSync(`${ABSOLUTE_ROOT_PATH}/_dist/assets/img`, {
          recursive: true,
        })
      }

      mix
        .setPublicPath(RELATIVE_PUBLIC_PATH)

        .before(() => {
          useConsole.clear()
          useConsole.log(
            `${chalk.grey(`Vulmix ${pkg.version}`)}\n${chalk.cyan(
              'Preparing production bundle...\n'
            )}`
          )

          mix
            .copy(
              `${RELATIVE_PACKAGE_PATH}/utils/tsconfig.json`,
              `${RELATIVE_PUBLIC_PATH}/.vulmix/types`
            )
            .copy(
              `${RELATIVE_PACKAGE_PATH}/types/vue-shims.d.ts`,
              `${RELATIVE_PUBLIC_PATH}/.vulmix/types`
            )
        })

        .copy(
          `${ABSOLUTE_PACKAGE_PATH}/utils/deploy/.htaccess`,
          ABSOLUTE_PUBLIC_PATH
        )

        .ejs(
          [
            `${RELATIVE_PACKAGE_PATH}/src/index.ejs`,
            `${RELATIVE_PUBLIC_PATH}/mix-manifest.json`,
          ],
          RELATIVE_PUBLIC_PATH,
          VulmixConfig,
          {
            partials: [`${RELATIVE_PUBLIC_PATH}/mix-manifest.json`],
            mixVersioning: true,
          }
        )

        .ts(
          `${ABSOLUTE_PACKAGE_PATH}/src/vue/main.ts`,
          `${ABSOLUTE_ROOT_PATH}/_dist/assets/_vulmix/js/main.vulmix.js`
        )

        .after(stats => {
          /**
           * Only prints user files to the terminal
           */
          const assets = { ...stats.compilation.assets }
          stats.compilation.assets = {}

          for (const [path, asset] of Object.entries(assets)) {
            if (!path.match(/((\.|_)vulmix|\.map)/)) {
              stats.compilation.assets[path] = asset
            }
          }

          setTimeout(() => {
            useConsole.clear()

            // Here I use native console object to block execution before the next message
            console.log(
              chalk.green(
                `${chalk.grey(
                  `Vulmix ${pkg.version}`
                )}\n\nOptimized build generated in the ${chalk.yellowBright(
                  isDevMode
                    ? getRelativePath(
                        ABSOLUTE_PACKAGE_PATH,
                        ABSOLUTE_PUBLIC_PATH
                      ).replace(/\.\//g, '')
                    : getRelativePath(
                        ABSOLUTE_ROOT_PATH,
                        ABSOLUTE_PUBLIC_PATH
                      ).replace(/\.\//g, '')
                )} folder. You can\ndeploy its contents on any static host.\n`
              )
            )

            useConsole.log(chalk.blueBright('Finishing...\n\n'))
          })
        })

      if (fs.existsSync(`${ABSOLUTE_ROOT_PATH}/assets/icons/`)) {
        mix.copy(
          `${ABSOLUTE_ROOT_PATH}/assets/icons`,
          `${ABSOLUTE_ROOT_PATH}/_dist/assets/icons`
        )
      }

      if (fs.existsSync(`${ABSOLUTE_ROOT_PATH}/assets/img/`)) {
        mix.copy(
          `${ABSOLUTE_ROOT_PATH}/assets/img`,
          `${ABSOLUTE_ROOT_PATH}/_dist/assets/img`
        )
      }
    } else {
      /**
       * Development mode only
       */
      fs.rmSync(`${ABSOLUTE_ROOT_PATH}/.vulmix/client/assets`, {
        recursive: true,
        force: true,
      })

      if (!fs.existsSync(`${ABSOLUTE_ROOT_PATH}/.vulmix/client/assets/img`)) {
        fs.mkdirSync(`${ABSOLUTE_ROOT_PATH}/.vulmix/client/assets/img`, {
          recursive: true,
        })
      }

      mix
        .setPublicPath(`${RELATIVE_ROOT_PATH}/.vulmix/client`)
        .before(() => {
          useConsole.clear()

          useConsole.log(
            `${chalk.grey(`Vulmix ${pkg.version}`)}\n${chalk.cyan(
              'Compiling...\n'
            )}`
          )
        })

        .webpackConfig({
          devtool: 'source-map',
        })

        .ejs(
          [
            `${RELATIVE_PACKAGE_PATH}/src/index.ejs`,
            `${RELATIVE_ROOT_PATH}/.vulmix/client/mix-manifest.json`,
          ],
          `${RELATIVE_ROOT_PATH}/.vulmix/client`,
          VulmixConfig,
          {
            partials: [
              `${RELATIVE_ROOT_PATH}/.vulmix/client/mix-manifest.json`,
            ],
            mixVersioning: true,
          }
        )

        .ts(
          `${ABSOLUTE_PACKAGE_PATH}/src/vue/main.ts`,
          `${ABSOLUTE_ROOT_PATH}/.vulmix/client/assets/_vulmix/js/main.vulmix.js`
        )

        .sourceMaps()

        .after(stats => {
          /**
           * Only prints user files to the terminal
           */
          const assets = { ...stats.compilation.assets }
          stats.compilation.assets = {}

          for (const [path, asset] of Object.entries(assets)) {
            if (!path.match(/((\.|_)vulmix|\.map)/)) {
              stats.compilation.assets[path] = asset
            }
          }

          setTimeout(() => {
            useConsole.clear()

            useConsole.log(
              chalk.blueBright(
                `${chalk.grey(
                  `Vulmix ${pkg.version}`
                )}\nHMR Server running at: ${chalk.green(
                  `http://localhost:${chalk.greenBright(argv.port)}/\n`
                )}`
              )
            )
          })
        })

        .browserSync({
          proxy: `localhost:${argv.port}`,
          logLevel: 'silent',
          open: false,
          notify: false,
          files: [
            ...useProjectFolderListener(),

            `${ABSOLUTE_ROOT_PATH}/app.{vue,js,ts}`,

            {
              match: `${ABSOLUTE_ROOT_PATH}/vulmix.config.ts`,
              fn: (event, file) => {
                if (event === 'change') {
                  useConsole.log(
                    chalk.cyan('\n\nConfig file changed. Recompiling...\n\n')
                  )

                  execSync(
                    `tsc ${ABSOLUTE_ROOT_PATH}/vulmix.config.ts --outDir ${ABSOLUTE_ROOT_PATH}/.vulmix`,
                    (error, stdout, stderr) => {
                      if (error) {
                        useConsole.log(chalk.red(`exec error: ${error}`))
                        return
                      }

                      useConsole.log(
                        chalk.cyanBright(
                          `\n\n${chalk.greenBright(
                            '✓'
                          )} Recompiling done. Please refresh the page.\n\n`
                        )
                      )
                    }
                  )
                }
              },
            },

            {
              match: `${ABSOLUTE_ROOT_PATH}/.vulmix/vulmix.config.js`,
              fn: (event, file) => {
                if (event === 'change') {
                  // Invalidate require cache
                  delete require.cache[require.resolve(VULMIX_CONFIG_PATH)]

                  const VulmixConfig_1 = require(VULMIX_CONFIG_PATH).default

                  useConsole.log(
                    chalk.cyan('\n\nRegenerating `index.html`...\n\n')
                  )

                  mix.ejs(
                    [
                      `${RELATIVE_PACKAGE_PATH}/src/index.ejs`,
                      `${RELATIVE_ROOT_PATH}/.vulmix/client/mix-manifest.json`,
                    ],
                    `${RELATIVE_ROOT_PATH}/.vulmix/client`,
                    VulmixConfig_1,
                    {
                      partials: [
                        `${RELATIVE_ROOT_PATH}/.vulmix/client/mix-manifest.json`,
                      ],
                      mixVersioning: true,
                    }
                  )
                }
              },
            },
          ],
        })

      if (fs.existsSync(`${ABSOLUTE_ROOT_PATH}/assets/icons/`)) {
        mix.copy(
          `${ABSOLUTE_ROOT_PATH}/assets/icons`,
          `${ABSOLUTE_ROOT_PATH}/.vulmix/client/assets/icons`
        )
      }

      if (fs.existsSync(`${ABSOLUTE_ROOT_PATH}/assets/img/`)) {
        mix.copy(
          `${ABSOLUTE_ROOT_PATH}/assets/img`,
          `${ABSOLUTE_ROOT_PATH}/.vulmix/client/assets/img`
        )
      }
    }
  }
}

mix.extend('vulmix', new VulmixInit())

module.exports = { vulmix }
