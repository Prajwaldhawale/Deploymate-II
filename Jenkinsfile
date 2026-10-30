pipeline {

    triggers {
        githubPush()
    }

    agent any

    environment {
        BACKEND_IMAGE = "deploymate-backend:ci"
        FRONTEND_IMAGE = "deploymate-frontend:ci"
    }

    stages {

        stage('Environment Check') {
            steps {
                sh '''
                    echo "=== System ==="
                    uname -a

                    echo "=== Python ==="
                    python3 --version

                    echo "=== Node ==="
                    node --version || true

                    echo "=== Docker ==="
                    docker --version

                    echo "=== Docker Compose ==="
                    docker compose version
                '''
            }
        }

        stage('Checkout') {
            steps {
                echo "Repository already checked out by Jenkins SCM"
            }
        }

        stage('Backend Validation & Unit Tests') {
            steps {
                sh '''
                    echo "=== Compiling Backend Code ==="
                    python3 -m compileall backend/app

                    echo "=== Running Risk Engine & Gatekeeper Unit Tests ==="
                    PYTHONPATH=. python3 -m pytest backend/tests/test_risk_engine.py backend/tests/test_gatekeeper_cli.py -v
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    echo "=== Building Backend Docker Image ==="
                    docker build \
                        -t ${BACKEND_IMAGE} \
                        ./backend

                    echo "=== Building Frontend Docker Image ==="
                    docker build \
                        -t ${FRONTEND_IMAGE} \
                        ./frontend
                '''
            }
        }

        stage('Gatekeeper CLI Verification') {
            steps {
                sh '''
                    echo "=== Verifying Gatekeeper CLI ==="
                    python3 scripts/deploymate_gate.py --help
                '''
            }
        }

        stage('Repository Check') {
            steps {
                sh '''
                    echo "=== Repository ==="
                    pwd

                    echo "=== Files ==="
                    ls -la

                    echo "=== Git Commit ==="
                    git log -1 --oneline
                '''
            }
        }
    }

    post {
        success {
            echo 'DeployMate-II CI pipeline completed successfully.'
        }

        failure {
            echo 'DeployMate-II CI pipeline failed.'
        }
    }
}
