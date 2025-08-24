/**
 * Handles publishing messages to Google Cloud Pub/Sub.
 */

/**
 * Publishes a JSON payload to a specified Pub/Sub topic.
 * This function uses the REST API and authenticates using the user's OAuth token.
 *
 * @param {string} topicName The name of the Pub/Sub topic (e.g., 'dawsheet.commands').
 * @param {object} json The JSON object to publish.
 */
function publish(topicName, json) {
  const projectId = PropertiesService.getScriptProperties().getProperty('GCP_PROJECT_ID');
  if (!projectId) {
    throw new Error("GCP_PROJECT_ID is not set in Script Properties.");
  }

  const topic = `projects/${projectId}/topics/${topicName}`;
  const url = `https://pubsub.googleapis.com/v1/${topic}:publish`;

  const payload = {
    messages: [
      {
        data: Utilities.base64Encode(JSON.stringify(json))
      }
    ]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + getAccessToken()
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode >= 400) {
    Logger.log(`Error publishing to Pub/Sub: ${responseCode} - ${responseBody}`);
    SpreadsheetApp.getUi().alert(`Failed to send command. Error: ${responseBody}`);
  } else {
    Logger.log(`Message published to ${topicName}: ${JSON.stringify(json)}`);
  }
}

/**
 * Retrieves the OAuth2 access token for the current user.
 *
 * @returns {string} The access token.
 */
function getAccessToken() {
  return ScriptApp.getOAuthToken();
}

// Status pulling implementation lives in Status.gs
