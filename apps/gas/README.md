# DAWSheet Google Apps Script (GAS)

This package contains the Google Apps Script code that runs within your Google Sheet. It provides the user interface (custom menu) and the logic to send commands to the Pub/Sub event bus.

## Setup

1.  **Install `clasp`**: If you don't have it, install the [Command-Line Apps Script Projects](https://github.com/google/clasp) tool:
    ```bash
    npm install -g @google/clasp
    ```

2.  **Log in**: Authenticate `clasp` with your Google account:
    ```bash
    clasp login
    ```

3.  **Create a new Sheet**: Go to [sheets.new](https://sheets.new) to create a new Google Sheet. This will be your DAW controller.

4.  **Create a Script Project**: Instead of creating a script from scratch, you will link this local code to your sheet.
    -   Run `clasp create --type sheets --title "DAWSheet Controller" --rootDir ./`.
    -   This will create a new Apps Script project and a `.clasp.json` file in this directory.

5.  **Set Script Properties**:
    -   Open your new script project in the Apps Script editor (`clasp open`).
    -   Go to **Project Settings** (the gear icon on the left).
    -   Scroll down to **Script Properties** and add the following properties:
        -   `GCP_PROJECT_ID`: Your Google Cloud Project ID.
        -   `COMMANDS_TOPIC`: `dawsheet.commands`
        -   `STATUS_TOPIC`: `dawsheet.status`

6.  **Push the Code**: From this directory (`/apps/gas`), run the push command:
    ```bash
    clasp push
    ```
    This will upload all the `.gs` and `.json` files to your Apps Script project.

7.  **Enable APIs**:
    -   In the Apps Script editor, go to **Services** (+ icon).
    -   Add the **Google Cloud Pub/Sub API**.

## How It Works

-   `Menu.gs`: Creates the "DAWSheet" menu when the sheet is opened (`onOpen`).
-   `Code.gs`: Contains the `onEdit` trigger that fires when you edit a cell. It parses the cell content and calls the publish function.
-   `PubSub.gs`: Handles the actual communication with the Google Cloud Pub/Sub REST API.
-   `appsscript.json`: The manifest file. It defines necessary permissions (OAuth scopes) and settings.
