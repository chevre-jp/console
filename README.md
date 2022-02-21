# Chevre Console

[![CircleCI](https://circleci.com/gh/chevre-jp/backend.svg?style=svg)](https://circleci.com/gh/chevre-jp/backend)

## Table of contents

* [Usage](#usage)
* [License](#license)

## Usage

### Environment variables

| Name                          | Required | Value            | Purpose                |
| ----------------------------- | -------- | ---------------- | ---------------------- |
| `DEBUG`                       | false    | chevre-backend:* | Debug                  |
| `REDIS_PORT`                  | true     |                  | Redis Cache Connection |
| `REDIS_HOST`                  | true     |                  | Redis Cache Connection |
| `REDIS_KEY`                   | true     |                  | Redis Cache Connection |
| `REDIS_TLS_SERVERNAME`        | false    |                  | Redis Cache Connection |
| `API_ENDPOINT`                | true     |                  |                        |
| `API_AUTHORIZE_SERVER_DOMAIN` | true     |                  |                        |
| `API_CLIENT_ID`               | true     |                  |                        |
| `API_CLIENT_SECRET`           | true     |                  |                        |
| `API_CODE_VERIFIER`           | true     |                  |                        |
| `USE_COA`                     | false    | 1 or 0           | COA usage flag         |

## License

ISC
