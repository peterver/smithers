import React from 'react'
import {css} from 'aphrodite'
import Event, {FOCUS_INPUT, PUT_INPUT} from 'Event'
import styles from './NavbarStyles'
import {Collection, CollectionItem} from 'components/UI/Collection'
import flatMap from 'lodash/flatMap'
import {fuzzysearch} from 'components/functions'

// UI Elements
import Icon from 'components/UI/Icon'
import pluginManager from 'PluginSystem/PluginManager'

const Keys = {
  ENTER: 13,
  UP: 38,
  DOWN: 40,
  TAB: 9,
  ESC: 27
};

const isTextSelected = (input) => {
  const startPos = input.selectionStart;
  const endPos = input.selectionEnd;
  const doc = document.selection;

  if (doc && doc.createRange().text.length != 0) {
    return true
  } else if (!doc && input.value.substring(startPos, endPos).length != 0) {
    return true
  }

  return false
};

let commands = [];
setTimeout(() => {
  commands = flatMap(pluginManager.list().map(plugin => plugin.commands));
});

const Navbar = React.createClass({
  getInitialState() {
    return {
      suggestions: [],
      currentSuggestion: -1
    }
  },
  getDefaultProps() {
    return {
      canGoBack: false,
      canGoForward: false
    };
  },

  getInput() {
    return this.refs.input;
  },

  resetSuggestions() {
    this.setState({
      suggestions: [],
      currentSuggestion: -1
    })
  },

  componentDidMount() {
    this.getInput().focus();

    Event.on(FOCUS_INPUT, () => this.getInput().focus());
    Event.on(PUT_INPUT, ({
      text,
      selectStart,
      selectEnd
    }) => {
      this.getInput().value = text;
      this.getInput().focus();
      if (selectStart && selectEnd) {
        this.getInput().setSelectionRange(selectStart, selectEnd)
      }
    })
  },

  parseUsage({usage, arguments: args, optionals}) {
    let result = usage.split(' ');

    if (args.length > 0) {
      args.forEach(arg => {
        result = result.map(item => {
          if (item === arg.match) {
            return <span className={css(styles.argument)}>{arg.humanized}</span>
          }

          return item;
        });
      });
    }

    if (optionals.length > 0) {
      optionals.forEach(arg => {
        result = result.map(item => {
          if (item === arg.match) {
            return <span className={css(styles.optional)}>{arg.humanized}</span>
          }

          return item;
        });
      });
    }

    return (
      <span>
          {result.map((item, i) => <span key={i} style={{
            marginRight: 4
          }}>{item}</span>)}
        </span>
    )
  },

  getSuggestionsFor(text) {
    if (text.trim().length <= 0) {
      return [];
    }

    return commands
      .filter(command => fuzzysearch(text.trim(), command.usage))
      .map(command => ({
        command,
        component: this.parseUsage(command)
      }));
  },

  executeCommand(value) {
    const {handleInput} = this.props;

    handleInput(value);
    pluginManager.execute(value);
    this.getInput().value = "";

    this.resetSuggestions();
  },

  handleKeyUp(e) {
    e.preventDefault();

    const {addTab} = this.props;

    switch (e.keyCode) {
      case Keys.ENTER:
        if (e.metaKey || e.ctrlKey) {
          addTab()
        }

        this.executeCommand(e.target.value);
        break;
      case Keys.ESC:
        this.selectInputText();
        this.resetSuggestions()
        break;
      case Keys.UP:
        if (this.props.canGoBack && this.state.suggestions.length <= 0) {
          this.props.previousCommand()
          setTimeout(() => {
            this.getInput().value = this.props.command
          })
        }
        break;
      case Keys.DOWN:
        if (this.props.canGoForward && this.state.suggestions.length <= 0) {
          this.props.nextCommand()
          setTimeout(() => {
            this.getInput().value = this.props.command
          })
        }
        break;
    }
  },

  handleKeyDown(e) {
    if (e.keyCode == Keys.TAB && this.state.suggestions.length <= 0) {
      e.preventDefault();

      e.shiftKey
        ? this.props.focusPrevTab()
        : this.props.focusNextTab();
    }

    if (this.state.suggestions.length > 0) {
      if (e.keyCode === Keys.UP || (e.keyCode === Keys.TAB && e.shiftKey)) {
        if (this.state.suggestions.length >= 0) {
          this.setState({currentSuggestion: (this.state.suggestions.length + this.state.currentSuggestion - 1) % this.state.suggestions.length}, () => {
            this.setSuggestionInInput();
          });
        }
      }

      if (e.keyCode === Keys.DOWN || (e.keyCode === Keys.TAB && !e.shiftKey)) {
        if (this.state.suggestions.length >= 0) {
          this.setState({currentSuggestion: (this.state.currentSuggestion + 1) % this.state.suggestions.length}, () => {
            this.setSuggestionInInput();
          });
        }
      }
    }
  },

  setSuggestionInInput() {
    const suggestion = this.state.suggestions[this.state.currentSuggestion];

    setTimeout(() => {
      Event.fire(PUT_INPUT, {
        text: suggestion.command.usage,
        selectStart: suggestion.command.usage.indexOf('<'),
        selectEnd: suggestion.command.usage.indexOf('>') + 1
      });
    })
  },

  selectInputText() {
    const input = this.getInput();
    input && input.setSelectionRange(isTextSelected(input) ? input.value.length : 0, input.value.length)
  },

  handleSuggestion(suggestion) {
    if (suggestion.command.arguments.length > 0 || suggestion.command.optionals.length > 0) {
      Event.fire(PUT_INPUT, {
        text: suggestion.command.usage,
        selectStart: suggestion.command.usage.indexOf('<'),
        selectEnd: suggestion.command.usage.indexOf('>') + 1
      });

      this.resetSuggestions();
    } else {
      this.executeCommand(suggestion.command.usage);
    }
  },

  render() {
    const {suggestions, currentSuggestion} = this.state

    return (
      <div className={css(styles.headerStyles)} onClick={() => this.getInput().focus()}>
        <div className={css(styles.inputWrapperStyles)}>
          <div className={css(styles.inputIconStyles)}>
            <Icon icon="terminal"/>
          </div>
          <input
            className={css(styles.inputStyles)}
            onKeyDown={this.handleKeyDown}
            onKeyUp={this.handleKeyUp}
            onChange={(e) => {
              this.setState({
                suggestions: this.getSuggestionsFor(e.target.value),
                currentSuggestion: -1
              });
            }}
            ref="input"
            type="text"
            placeholder="Type your commands here..."
          />

          {/* SUGGESTIONS */}
          <Collection className={css(styles.suggestions)}>
            {suggestions.map((suggestion, i) => (
              <CollectionItem
                key={`suggestion_${i}`}
                className={css(styles.suggestion, currentSuggestion === i ? styles.activeSuggestion : undefined)}
                scrollIntoView={currentSuggestion === i}
                onClick={() => this.handleSuggestion(suggestion)}
              >{suggestion.component}</CollectionItem>
            ))}
          </Collection>
        </div>
      </div>
    )
  }
});

export default Navbar
