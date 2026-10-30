# DeployMate-II Jenkins Integration Guide

DeployMate-II acts as an automated DevSecOps release gatekeeper within Jenkins pipelines. It evaluates builds, automated test results, security vulnerability scans (e.g., Trivy), and system telemetry against deterministic risk gates before authorizing deployment to staging or production.

---

## 1. Prerequisites in Jenkins

1. **Python 3**: Ensure `python3` is available on the Jenkins agent (the gatekeeper CLI has zero third-party dependencies).
2. **Credentials in Jenkins**:
   - Go to **Manage Jenkins** > **Credentials** > **System** > **Global credentials**.
   - Add **Username with password**:
     - **ID**: `deploymate-credentials`
     - **Username**: Registered DeployMate user email (e.g. `ci-bot@deploymate.internal`)
     - **Password**: Password for the user account
   - *(Optional)* Add **Secret text**:
     - **ID**: `deploymate-api-url`
     - **Secret**: URL of the DeployMate-II API (e.g., `http://deploymate-backend:8000` or `http://<ec2-ip>:8000`)
3. *(Optional)* **Trivy Scanner**:
   - Install Trivy on the agent or run it via Docker: `aquasec/trivy:latest`.

---

## 2. Using the Gatekeeper CLI in Jenkinsfile

The gatekeeper script is located at [`scripts/deploymate_gate.py`](../scripts/deploymate_gate.py).

### Quick Pipeline Example

```groovy
stage('DeployMate-II Risk Gate') {
    steps {
        withCredentials([usernamePassword(
            credentialsId: 'deploymate-credentials',
            usernameVariable: 'DEPLOYMATE_EMAIL',
            passwordVariable: 'DEPLOYMATE_PASSWORD'
        )]) {
            sh '''
                python3 scripts/deploymate_gate.py \
                    --api-url "${DEPLOYMATE_API_URL:-http://localhost:8000}" \
                    --project-name "${JOB_NAME}" \
                    --environment "production" \
                    --build-status "SUCCESS" \
                    --test-status "PASS" \
                    --trivy-json "trivy-results.json" \
                    --output-file "deploymate-assessment.json"
            '''
        }
    }
}
```

---

## 3. Exit Code Policy

The script returns standard exit codes that Jenkins uses to control pipeline execution flow:

| Exit Code | Decision | Meaning in Pipeline |
| :--- | :--- | :--- |
| **`0`** | `APPROVE` | Risk score within acceptable thresholds, no blockers. Pipeline proceeds to deployment. |
| **`0`** *(or `2` with `--fail-on-review`)* | `REVIEW` | Risk score elevated. Warning printed; can trigger a Jenkins `input` manual approval step. |
| **`1`** | `BLOCK` | Hard gates failed (build failure, critical vulnerabilities, or risk score $\ge$ 60). Pipeline immediately terminates. |
| **`3`** | `ERROR` | Missing credentials, network failure, or API unreachable. |

---

## 4. Full Pipeline Template

A complete end-to-end target microservice pipeline is available at [`jenkins/Jenkinsfile.target-demo`](./Jenkinsfile.target-demo). It demonstrates:
1. Automated unit test execution and exit code capture.
2. Automated Trivy vulnerability scanning into JSON.
3. DeployMate-II gate evaluation.
4. Pausing for human approval via `input` only when decision is `REVIEW`.
5. Safe deployment only when approved.

