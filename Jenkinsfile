pipeline {
    agent any

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

        stage('Backend Validation') {
            steps {
                sh '''
                    python3 -m compileall backend/app
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