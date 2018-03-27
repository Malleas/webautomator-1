const WebAccessor = require('./WebAccessor');

/**
 * Fluent API for setting something identified by a key (e.g. label text).
 * @extends WebAccessor
 */
class WebSetter extends WebAccessor {
  /**
   * Sets one more items on the page to the specified values.
   * @param {...String} values - The values to set each item to.
   * @returns {Promise<void>}
   */
  async to(...values) {
    if (values.length === 1 && Array.isArray(values[0])) {
      values = values[0];
    }
    let caught = undefined;
    const condition = async () => {
      try {
        let {content, index} = await this.webContext._getContentWithIndexOfContext([...this.webContext.precedings, this.key], this._timeout);
        for (const value of values) {
          const settableOffset = content.slice(index + 1).findIndex(item => WebContentItems.isSettable(item));
          if (settableOffset === -1) {
            throw "No more settables!";
          }
          index += settableOffset + 1;
          let settable = content[index];
          switch (settable.tagName) {
            case "SELECT":
              const matcher = value instanceof RegExp ? String.prototype.match : String.prototype.includes;
              let option = settable.options.find(option => matcher.call(option.text, value));
              if (!option) {
                throw `No option with text found: ${value}`;
              }
              if (option.isSelected) {
                break;
              } else {
                await option.element.click();
              }
              break;
            case "INPUT":
              switch (settable.type) {
                case "radio":
                  while (true) {
                    const label = content[index + 1];
                    if (label && label.text === value) {
                      await label.parentElement.click();
                      break;
                    } else {
                      settable = content[index += 2];
                      if (settable.type !== "radio") {
                        throw `No radio button with label found: ${value}`;
                      }
                    }
                  }
                  break;
                default:
                  await settable.element.sendKeys(value);
                  break;
              }
              break;
            default:
              await settable.element.sendKeys(value);
              break;
          }
        }
        return true;
      } catch (e) {
        if (typeof e === "string") {
          caught = e;
          return false;
        } else {
          throw e;
        }
      }
    };
    const message = caught || `Could not set "${this.key}" to ${values}`;
    await this.webContext.webDriver.wait(condition, this._timeout, message);
  }
}

const WebContentItems = {
  isSettable(item) {
    switch (item.tagName) {
      case "INPUT":
      case "SELECT":
      case "TEXTAREA":
        return true;
      default:
        return false;
    }
  }
};

module.exports = WebSetter;