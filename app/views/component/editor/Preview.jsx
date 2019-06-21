import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { ipcRenderer, remote } from 'electron';
import classNames from 'classnames';
import { withTheme, withPlatform } from 'Components/HOC/context';
import { getMermaidJSPath, getWebviewPreJSPath } from 'Utils/utils';
import LoadingImg from 'Assets/images/loading.svg';
import { debug } from 'util';
import { eventTOC } from '../../events/eventDispatch';

import '../../assets/scss/preview.scss';


const isDEV = process.env.NODE_ENV === 'development';

const preJSPath = getWebviewPreJSPath();
const mermaidJSPath = getMermaidJSPath();
debug.log(mermaidJSPath);


const webviewPath = ipcRenderer.sendSync('get-webview-path');

@withTheme
@withPlatform
export default class Preview extends Component {
  static displayName = 'MarkdownPreview';
  static propTypes = {
    platform: PropTypes.string.isRequired,
    html: PropTypes.string.isRequired,
    theme: PropTypes.string.isRequired,
    editorMode: PropTypes.string.isRequired,
    fontSize: PropTypes.number.isRequired,
    drag: PropTypes.bool.isRequired,
    editorWidthValue: PropTypes.number.isRequired,
  };

  static defalutProps = {
    fontSize: 16,
  };

  constructor(props) {
    super(props);
    const bodyWidth = this.getBodyWidth(props);
    this.state = {
      bodyWidth,
      loading: true,
      webviewReady: false,
    };
  }

  componentDidMount() {
    this.noteRoot = document.getElementById('note_root_cont');
    window.addEventListener('resize', this.onWindowResize);
    this.webview.addEventListener('dom-ready', this.setReady);
    this.webview.addEventListener('ipc-message', this.onWVMessage);
    eventTOC.on('toc-jump', this.handleTOCJump);
  }

  componentDidUpdate(prevProps) {
    const { html, editorMode, theme } = this.props;
    if (this.state.webviewReady) {
      this.webview.send('wv-render-html', {
        html,
        editorMode,
        theme,
      });
    }
    if (this.props.editorMode !== prevProps.editorMode || this.props.editorWidthValue !== prevProps.editorWidthValue) {
      const bodyWidth = this.getBodyWidth(this.props);
      this.setWidth(bodyWidth);
    }
    if (this.props.fontSize !== prevProps.fontSize) {
      const { fontSize } = this.props.fontSize;
      if (this.state.webviewReady) {
        this.webview.send('wv-change-fontsize', fontSize);
      }
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize);
    this.webview.removeEventListener('dom-ready', this.setReady);
    this.webview.removeEventListener('ipc-message', this.onWVMessage);
    eventTOC.removeListener('toc-jump', this.handleTOCJump);
  }

  onWindowResize = () => {
    const { editorMode } = this.props;
    if (editorMode === 'edit') {
      const bodyWidth = this.getBodyWidth();
      this.setState({
        bodyWidth,
      });
    }
  }

  @autobind
  onWVMessage(event) {
    const channel = event.channel;
    const { html, editorMode, fontSize, theme, platform } = this.props;
    switch (channel) {
      case 'wv-first-loaded': {
        this.webview.send('wv-render-html', {
          html,
          editorMode,
          fontSize,
          theme,
          platform,
        });
        this.setState({
          loading: false,
        });
        break;
      }
      case 'did-click-link': {
        let href = '';
        if (event.args && event.args.length) {
          href = event.args[0];
        }
        if (/^https?:\/\//i.test(href)) {
          remote.shell.openExternal(href);
        }
        break;
      }
      default:
        break;
    }
  }

  @autobind
  setReady() {
    this.setState({
      webviewReady: true,
    });
  }

  getBodyWidth(props) {
    let editorMode;
    let editorWidthValue;
    if (props) {
      editorMode = props.editorMode;
      editorWidthValue = props.editorWidthValue;
    } else {
      editorMode = this.props.editorMode;
      editorWidthValue = this.props.editorWidthValue;
    }
    if (editorMode === 'normal') {
      return '100%';
    }
    if (editorMode === 'preview') {
      return '100%';
    }
    if (!this.preview || !this.noteRoot) {
      return '100%';
    }
    if (this.preview) {
      let parentWidth;
      if (editorMode === 'edit' || editorMode === 'write') {
        parentWidth = this.noteRoot.offsetWidth;
      } else {
        parentWidth = this.preview.offsetParent.offsetWidth;
      }
      let res = '100%';
      if (editorWidthValue && parentWidth) {
        res = `${parentWidth * (1 - editorWidthValue)}px`;
      }
      return res;
    }
    return '100%';
  }

  setWidth(bodyWidth) {
    this.setState({
      bodyWidth,
    });
  }

  setScrollRatio(radio) {
    this.webview.send('wv-scroll', radio);
  }

  @autobind
  openWVDevTools() {
    if (this.webview) {
      this.webview.openDevTools();
    }
  }

  handleTOCJump = (data) => {
    const { depth, text } = data;
    if (text && depth && this.webview) {
      this.webview.send('scroll-target', data);
    }
  }

  renderLoading() {
    if (this.state.loading) {
      return (
        <img
          className="preview-loading"
          src={LoadingImg}
          style={{
            position: 'absolute',
          }}
          alt=""
        />
      );
    }
  }

  render() {
    const { bodyWidth } = this.state;
    const { editorMode, drag } = this.props;
    const rootClass = classNames(
      'preview-root',
      {
        hide: editorMode === 'immersion' || editorMode === 'write',
      },
      {
        'pre-mode': editorMode === 'preview',
      },
      {
        drag,
      }
    );
    return (
      <div
        className={rootClass}
        ref={node => (this.preview = node)}
      >
        {isDEV ? (
          <span
            className="wv-dev-tools"
            onClick={this.openWVDevTools}
          >
            devtools
          </span>
        ) : null}
        {this.renderLoading()}
        <div
          className="preview-body"
          style={{ width: bodyWidth }}
          ref={node => (this.previewBody = node)}
        >
          {drag ? (<div className="preview-layer" />) : null}
          <webview
            id="webview"
            className="preview-webview"
            webpreferences="contextIsolation=yes"
            disableblinkfeatures="Auxclick"
            nodeintegration="true"
            src={webviewPath}
            preload={preJSPath}
            onDrop={e => e.preventDefault()}
            ref={node => (this.webview = node)}
          />
        </div>
      </div>
    );
  }
}
