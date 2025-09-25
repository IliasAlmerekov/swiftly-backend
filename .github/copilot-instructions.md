# COPILOT EDITS OPERATIONAL GUIDELINES

## GOAL

    Copilot must generate modern, secure, and clean code that follows best practices, KISS principles, and WCAG 2.2 standards (for frontend).
    The code should be thoroughly reviewed, avoid outdated patterns, and be easy to read and maintain.

## PRIME DIRECTIVE

    Avoid working on more than one file at a time.
    Multiple simultaneous edits to a file will cause corruption.
    Be chatting and teach about what you are doing while coding.

## LARGE FILE & COMPLEX CHANGE PROTOCOL

### MANDATORY PLANNING PHASE

    When working with large files (>300 lines) or complex changes:
    	1. ALWAYS start by creating a detailed plan BEFORE making any edits
            2. Your plan MUST include:
                   - All functions/sections that need modification
                   - The order in which changes should be applied
                   - Dependencies between changes
                   - Estimated number of separate edits required

            3. Format your plan as:

## PROPOSED EDIT PLAN

    Working with: [filename]
    Total planned edits: [number]

### MAKING EDITS

    - Focus on one conceptual change at a time
    - Show clear "before" and "after" snippets when proposing changes
    - Include concise explanations of what changed and why
    - Always check if the edit maintains the project's coding style

### Edit sequence:

    1. [First specific change] - Purpose: [why]
    2. [Second specific change] - Purpose: [why]
    3. Do you approve this plan? I'll proceed with Edit [number] after your confirmation.
    4. WAIT for explicit user confirmation before making ANY edits when user ok edit [number]

### EXECUTION PHASE

    - After each individual edit, clearly indicate progress:
    	"✅ Completed edit [#] of [total]. Ready for next edit?"
    - If you discover additional needed changes during editing:
    - STOP and update the plan
    - Get approval before continuing

### REFACTORING GUIDANCE

    When refactoring large files:
    - Break work into logical, independently functional chunks
    - Ensure each intermediate state maintains functionality
    - Consider temporary duplication as a valid interim step
    - Always indicate the refactoring pattern being applied

### RATE LIMIT AVOIDANCE

    - For very large files, suggest splitting changes across multiple sessions
    - Prioritize changes that are logically complete units
    - Always provide clear stopping points

## General Requirements

    Use modern technologies as described below for all code suggestions. Prioritize clean, maintainable code with appropriate comments.

### Accessibility

    - Ensure compliance with **WCAG 2.1** AA level minimum, AAA whenever feasible.
    - Always suggest:
    - Labels for form fields.
    - Proper **ARIA** roles and attributes.
    - Adequate color contrast.
    - Alternative texts (`alt`, `aria-label`) for media elements.
    - Semantic HTML for clear structure.
    - Tools like **Lighthouse** for audits.

## Browser Compatibility

    - Prioritize feature detection (`if ('fetch' in window)` etc.).
        - Support latest two stable releases of major browsers:
    - Firefox, Chrome, Edge, Safari (macOS/iOS)

## Requirements Node.js + MongoDB + JWT + Express

    - Modern and Secure Code
    - Always use latest stable features of Node.js and Express.
    - Validate and sanitize all user inputs (e.g., Joi or Zod).
    - Protect against:
        - NoSQL injection
        - XSS
        - CSRF
        - JWT token theft
    -   Clean Architecture (KISS Principle)

    -   Maintain a clear folder structure:
        /controllers
        /routes
        /models
        /middlewares
        /services

    - Keep code simple, readable, and maintainable.
    - Use async/await for asynchronous operations.
    - Modularize code into small, single-responsibility functions.
    - No hardcoding of secrets or sensitive data – use environment variables.
    
    - Authentication & Authorization
    - Use JWT with:
        - Short-lived access tokens.
        - Refresh tokens stored securely (HTTP-only cookies).
        - Implement role-based access control (RBAC).

    - Error Handling
    - Centralized error middleware.
    - Consistent and secure error messages (no sensitive data leaks).

    - RESTful API Standards
    - Use proper HTTP methods and status codes.
    - Implement pagination, filtering, and sorting for list endpoints.
    - Follow RESTful best practices.

    - Testing
    - Unit tests with Vitest for all critical services and controllers.
    - Integration tests for API endpoints.
    - Database Management

    - Use Mongoose with strict schemas and validation.
    - Prevent unindexed queries by defining proper indexes.
    - Implement soft deletes or archival where needed.
    - Deployment Ready
    - Containerized backend with Docker.
    - Secure configuration using .env and secrets management.


## Summary:
    - Copilot must generate backend code that is secure, modern, and clean, strictly following KISS principles, industry security standards, and REST best practices.