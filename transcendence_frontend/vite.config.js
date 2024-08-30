
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    // const envFile = mode === 'development' ? '.env.development' : '.env.production';
    // process.env.V
    return {
        publicDir: './public',
        build: {
            target: 'esnext',
            outDir: './build'
        },
        envDir: '../',
        test: {
            globals: true,
            environment: 'jsdom',
        }
    };
});


// /** @type {import('vite').UserConfig} */
// export default {
//     // Specify the root directory of your project

//     // Specify the public directory (optional)
//     publicDir: './public',

//     // Specify the output directory for the build (optional)
//     build: {
//         outDir: './dist',
//         // Specify the target environment (e.g., 'esnext', 'es2015')
//         target: 'esnext',

//         // Enable/disable minification (default: 'terser')
//         // minify: 'terser',

//         // Enable/disable CSS code splitting (default: true)
//         cssCodeSplit: true,

//         // Add any additional build options here
//         // ...
//     },
//     test: {
//         globals: true,
//         environment: 'jsdom',
//     },

//     // Configure the server options (optional)
//     // server: {
//     //     port: 3000,
//     // },

//     // Add any additional plugins or configurations here
//     plugins: [],
// };
