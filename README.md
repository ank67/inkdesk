# DocuSphere Reader

Role: Act as an expert Full-Stack Software Engineer and AI Systems Architect.

Objective: Build a high-performance, offline-first Web Application (Progressive Web App) for an eBook and document reader based on the feature roadmap provided below. Execute the implementation step by step, maintaining high code quality, performance optimizations, and complete offline capability.

Project Blueprint & Tech Stack

 * Framework: React / Next.js or Vite (PWA configured with Service Workers)

 * Local Storage & Database: Dexie.js (IndexedDB wrapper) for full offline file blob and annotation persistence

 * Document Parsers: PDF.js (PDFs), Mammoth.js (DOCX), PPTX2HTML / PPTX.js (PPTX)

 * UI/UX Design: Tailwind CSS + Lucide Icons (Modern, dark-themed, distraction-free aesthetic)

 * Native APIs: Web Speech API (Text-to-Speech), Web File System Access API (Local folder sync)

Core Feature Roadmap

 * Storage & Offline Infrastructure

   * Implement Dexie.js (IndexedDB) to store .pdf, .docx, and .pptx file blobs with zero cloud dependencies.

   * Build a live storage meter UI showing remaining local device storage, along with auto-archive and cache cleanup settings.

   * Set up unified client-side document parsers for native multi-format rendering.

 * Reader & Document Viewer

   * Smart TOC & Sections: Auto-generated Table of Contents for DOCX/PDF headings + custom user bookmarking.

   * Touch Controls: Pinch-to-zoom, double-tap reset, continuous scroll, and page-fit lock toggles.

   * Distraction-Free Mode: Fullscreen reading, Sepia/Night themes, line spacing, and font adjustments.

   * Annotation Layer: Highlight text, attach sticky notes, and canvas draw overlays (saved directly to IndexedDB).

 * Dynamic Power Features

   * Instant Full-Text Search: Full-text indexing across all offline files to search across the entire library in milliseconds.

   * Slide Presenter Mode: Fullscreen presentation mode with swipe controls and speaker notes view for PPTX files.

   * Audio Reader (TTS): Integrated Web Speech API to listen to document chapters offline hands-free.

   * Local File Sync: Web File System Access API integration to sync designated local folders automatically without re-uploading.

Execution Request

Please start by providing the Project Architecture & Folder Structure, followed by the implementation of the Offline File Uploader and IndexedDB Storage Layer using Dexie.js. Include clean, modular, an

d production-ready code.





Role: Act as a Principal UI/UX Designer and Lead Design Systems Engineer.

Objective: Design a modern, ultra-clean, and distraction-free UI/UX for an offline-first eBook and document reader PWA. The interface must be optimized for both desktop and touch devices, featuring a sleek dark aesthetic, intuitive reader controls, and seamless navigation across multi-format documents (.pdf, .docx, .pptx).

Design Requirements & Aesthetics

 * Design Aesthetic: Dark mode first (Slate/Zinc palette), minimalist, accessibility-compliant (WCAG AA standard), with soft accent colors (Indigo/Cyan) for active elements and highlights.

 * Layout Structure:

   * Sidebar / Library View: Grid/List view of documents with cover previews, file tags, format badges (PDF, DOCX, PPTX), and a live Storage Usage Meter (progress bar with auto-cleanup settings trigger).

   * Top Navigation Bar: Quick search bar (instant full-text search), layout view toggles, dark/sepia/light theme switcher, and upload zone.

   * Main Reading View: Clean canvas area with distraction-free focus mode, collapsible Table of Contents (TOC) drawer, and floating annotation toolbar.

   * Bottom Control Dock (Reader Mode): Page counter, slider navigation, zoom controls (+ / - / fit-to-screen), Text-to-Speech audio controller, and fullscreen presenter toggle.

 * Micro-Interactions & Touch UX: Smooth transitions for sidebar toggles, pinch-to-zoom overlays, double-tap zoom resets, and responsive touch-swipe controls for presentation slides.

Deliverables Needed

 * Information Architecture (IA) & Wireframe Layout: Detail the screen hierarchy, drawer/modal states, and responsive breakpoints (Mobile, Tablet, Desktop).

 * Design System Specification: Color tokens (Tailwind CSS hex codes), typography scale, spacing variables, and icon usage guidelines (Lucide Icons).

 * Component Architecture (React + Tailwind): Provide the full UI/UX component code for:

   * Library & File Dashboard (with Storage Indicator & Format Filters)

   * Reader Interface Container (with Collapsible TOC, Floating Annotation Bar, and Audio Dock)

   * Slide Presenter View Overlay (for PPTX presentations)

Please generate the Design System Specification and the complete React + Tailwind CSS code for the main UI Layout and Dashboard.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://inkdesk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a303802b-7fa3-44a9-bc14-90dfc7ee637e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
