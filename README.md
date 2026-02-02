🌍 Plan It Ahead - Full Stack Travel Planner

🚀 Description

PlanItAhead.com is an AI-powered travel planning web app that helps users generate personalized itineraries. It integrates flights, hotels, attractions, and a companion matching system, allowing users to plan trips, save preferences, and chat with potential travel companions—all in one place.

This project demonstrates advanced database design, API integration, and AI-powered personalization, making it both educational and practical.

🎯 Motivation

Travel planning is often scattered across multiple platforms, making it inefficient and time-consuming. PlanItAhead streamlines this by:

Handling all travel planning in one platform

Demonstrating complex relational database design

Integrating external APIs for flights, hotels, and attractions

Providing AI-driven recommendations and companion matching

💻 Tech Stack

Frontend: React.js, TypeScript, Vite, Tailwind CSS

Backend: Flask, Python

Database: PostgreSQL / SQLite

AI Modules: OpenAI API, Pandas

Deployment: Vercel

External APIs: Serp API, Google API, OpenTripMap API

✨ Features
Basic

User registration, login, and profile management

Create, view, update, and delete itineraries

Search for flights, hotels, and attractions via APIs

Add trips elements (flights, hotels, attractions) to itineraries

Advanced

AI-driven itinerary generation and recommendations based on preferences

Companion matching with chat functionality

Optimized itinerary planning considering activity duration, distance, and timing

🗄 Database Overview

Fully normalized relational schema (3NF/BCNF)

Key tables: Users, Itineraries, Flights, Hotels, Attractions, Bookings, Conversations, Messages, CompanionMatches

Handles many-to-many relationships using junction tables (Plans, Includes, Adds, Has, ComesWith)

Enforces data integrity with foreign keys, unique constraints, and cascading updates/deletes
