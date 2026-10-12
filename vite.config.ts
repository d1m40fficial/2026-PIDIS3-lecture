import {diagramLayoutPlugin} from './scripts/diagram-layout-plugin';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {notesStoragePlugin} from './scripts/notes-storage-plugin';
export default defineConfig({plugins:[notesStoragePlugin(),diagramLayoutPlugin(),react()],optimizeDeps:{exclude:['@olgakraven/lecture-engine']},base:process.env.BASE_PATH || '/2026-PIDIS3-lecture/',build:{sourcemap:false}});
