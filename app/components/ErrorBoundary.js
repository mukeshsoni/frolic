import { Component } from 'react'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, errorInfo: '' }
    }

    componentDidCatch(error, info) {
        console.log('error boundary caught this error', error, info)
        this.setState({ hasError: true, errorInfo: info })
    }

    render() {
        if(this.state.hasError) {
            return <div>
                <h1>Something went wrong</h1>
                <div>{ this.state.errorInfo }</div>
              </div>
        }

        return this.props.children
    }
}

export default ErrorBoundary
