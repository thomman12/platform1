# Understanding Authentication in a Next.js + Supabase Application

## Overview

This document explains how authentication works in a web application built using **Next.js (App Router)** and **Supabase**.  
It is intended for developers who are new to the stack and want to understand how user authentication, session handling, and protected data access fit together.

The example described here is based on a real full-stack application, where users can sign up, log in, and access personalised data stored in a PostgreSQL database.

---

## Key Components

Authentication in this setup relies on three main components:

- **Next.js** – Handles routing, rendering, and server-side logic
- **Supabase Auth** – Manages user authentication and sessions
- **Supabase Database (PostgreSQL)** – Stores user data with access controlled by policies

Each component plays a specific role in ensuring users can securely access the application.

---

## Authentication Flow

### 1. User Sign-Up or Login

When a user signs up or logs in, the frontend calls Supabase’s authentication API using the Supabase client.


- The user provides an email and password
- Supabase validates the credentials
- A session is created for the authenticated user

If authentication succeeds, Supabase returns session information that can be used across the application.

---

### 2. Session Handling

Once authenticated, the user’s session is maintained by Supabase.

In a Next.js application:
- Session information can be accessed on the client
- Server-side logic can also check whether a user is authenticated
- Middleware can be used to restrict access to certain routes

This ensures users remain logged in as they navigate between pages.

---

### 3. Protecting Routes and UI States

Protected routes are used to prevent unauthenticated users from accessing restricted pages.

For example:
- Logged-out users are redirected to a login page
- Logged-in users can access dashboard pages and personalised content

On the frontend, UI components react to the user’s authentication state, displaying different content depending on whether the user is signed in.

---

## Securing Data with Row-Level Security

Authentication alone is not enough to protect user data.

Supabase uses **Row-Level Security (RLS)** policies to ensure:
- Users can only read or modify their own data
- Database access rules are enforced at the database level

For example:
- Each row of data is linked to a specific user ID
- RLS policies check that the authenticated user matches the row owner

This approach prevents users from accessing data that does not belong to them, even if requests are manipulated.

---

## Why This Approach Works Well

This authentication setup offers several advantages:

- Clear separation between frontend, authentication, and data layers
- Secure access control enforced by the database
- Scalable pattern suitable for production applications
- Minimal custom authentication logic required in the application code

By combining Next.js and Supabase, developers can focus on building features while relying on proven authentication mechanisms.

---

## Conclusion

Authentication in a Next.js and Supabase application is built around clear responsibilities:
- Supabase handles identity and access control
- Next.js manages routing and user experience
- The database enforces data security through policies

Understanding how these pieces work together makes it easier to build secure, user-focused applications and to document them accurately for other developers.
