const path = require('path');

module.exports = [
    {
        entry: './src/index.ts',
        output: {
            path: path.resolve(__dirname, './dist'),
			filename: 'index.js',
            library: {
                type: 'umd'
            },
            globalObject: `typeof self !== 'undefined' ? self : this`
        },
        module: {
			rules: [
				{
					test: /\.(ts)$/,
					exclude: /node_modules/,
					use: [
                        'babel-loader',
                        {
                            loader: 'ts-loader',
                            options: {
                              transpileOnly: true,
                            },
                        }
                    ]
				}
            ]
        },
        resolve: {
            extensions: ['.ts', '.js']
        }
    },
]