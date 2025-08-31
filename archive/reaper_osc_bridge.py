import logging
import yaml
from flask import Flask, request, jsonify
from pythonosc.udp_client import SimpleUDPClient

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

# Load configuration from config.yaml
try:
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
except FileNotFoundError:
    logging.error("config.yaml not found. Please create one with OSC_IP, OSC_PORT, BRIDGE_BIND, BRIDGE_PORT, and SHARED_SECRET.")
    exit(1)
except yaml.YAMLError as e:
    logging.error(f"Error parsing config.yaml: {e}")
    exit(1)

# OSC Client configuration
OSC_IP = config.get('osc_ip', '127.0.0.1')
OSC_PORT = int(config.get('osc_port', 9000))
osc_client = SimpleUDPClient(OSC_IP, OSC_PORT)
logging.info(f"OSC client initialized: Sending to {OSC_IP}:{OSC_PORT}")

# Flask server configuration
BRIDGE_BIND = config.get('bridge_bind', '127.0.0.1')
BRIDGE_PORT = int(config.get('bridge_port', 5000))
SHARED_SECRET = config.get('shared_secret') # optional

# Define the mapping of command types to OSC addresses
COMMAND_MAP = {
    "REAPER.VOLUME.SET": "/track/{}/volume",
    "REAPER.MUTE.SET": "/track/{}/mute"
}

@app.before_request
def check_secret():
    """Checks for a shared secret header if configured."""
    if SHARED_SECRET and request.headers.get('X-DAWSheet-Secret') != SHARED_SECRET:
        logging.warning("Unauthorized access attempt due to invalid X-DAWSheet-Secret.")
        return jsonify({"status": "error", "message": "unauthorized"}), 401

@app.route('/reaper/command', methods=['POST'])
def handle_reaper_command():
    """
    Handles incoming POST requests to control REAPER via OSC.
    Expected JSON payload:
    {
      "type": "REAPER.VOLUME.SET",
      "payload": { "track": 1, "value": 0.75 }
    }
    or
    {
      "type": "REAPER.MUTE.SET",
      "payload": { "track": 1, "value": true }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Invalid JSON"}), 400

        command_type = data.get('type')
        payload = data.get('payload', {})

        if not command_type or command_type not in COMMAND_MAP:
            return jsonify({"status": "error", "message": f"Unknown command type: {command_type}"}), 400

        track_num = payload.get('track')
        value = payload.get('value')

        if track_num is None:
            return jsonify({"status": "error", "message": "Missing 'track' number in payload."}), 400

        osc_address_template = COMMAND_MAP[command_type]
        osc_address = osc_address_template.format(track_num)
        osc_args = []

        if command_type == "REAPER.VOLUME.SET":
            if value is None:
                return jsonify({"status": "error", "message": "Missing 'value' for VOLUME.SET."}), 400
            # Clamp value between 0.0 and 1.0 for volume
            float_value = max(0.0, min(1.0, float(value)))
            osc_args.append(float_value)
            logging.info(f"Sending OSC: {osc_address} {float_value}")
        elif command_type == "REAPER.MUTE.SET":
            if value is None:
                return jsonify({"status": "error", "message": "Missing 'value' for MUTE.SET (true|false)."}), 400
            # Accept truthy/falsy; convert to 0.0/1.0
            mute_val = 1.0 if str(value).lower() in ("1", "true", "yes", "on") else 0.0
            osc_args.append(mute_val)
            logging.info(f"Sending OSC: {osc_address} {mute_val}")
        else:
            return jsonify({"status": "error", "message": "Command type not implemented."}), 501

        osc_client.send_message(osc_address, osc_args)
        return jsonify({"status": "success", "command": command_type, "track": track_num, "value": value}), 200

    except ValueError as e:
        logging.error(f"Data conversion error: {e}")
        return jsonify({"status": "error", "message": f"Invalid value format: {e}"}), 400
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}", exc_info=True)
        return jsonify({"status": "error", "message": f"Internal server error: {e}"}), 500

if __name__ == '__main__':
    # Run the Flask app
    logging.info(f"Starting Flask server on {BRIDGE_BIND}:{BRIDGE_PORT}")
    app.run(host=BRIDGE_BIND, port=BRIDGE_PORT, debug=False)
