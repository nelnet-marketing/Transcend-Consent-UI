import { ComponentChild, Fragment, h, JSX } from 'preact';

/**
 * Props that are always on this element
 */
interface MenuItemBaseProps
  extends JSX.HTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
  /** Aria Label */
  label: string;
  /** Inner HTML of <a> tag */
  children: ComponentChild;
  classes?: string;

}

/**
 * Props if this is a button
 */
interface MenuItemButtonProps extends MenuItemBaseProps {
  /** Whether this is a button or a tag */
  type: 'button';
  href?: never;
  rel?: never;
  target?: never;
}

/**
 * Props if this is an anchor (a tag)
 */
interface MenuItemAnchorProps extends MenuItemBaseProps {
  /** Whether this is a button or a tag */
  type: 'a';
  href?: string;
  rel?: string;
  target?: string;
}

/**
 * Props for this menu item, which may be a button or an anchor (<a>) tag
 * If type === button, then includes button native props
 * If type === a, then includes anchor native props
 */
type MenuItemProps = MenuItemAnchorProps | MenuItemButtonProps;

/**
 * A set of buttons to choose a set of predefined options
 */
export function MenuItem({
  type,
  onClick,
  children,
  classes,
  href,
  rel,
  target,
}: MenuItemProps): JSX.Element {
  return (
    <Fragment>
      {type === 'button' && (
        <button
          onClick={onClick as JSX.MouseEventHandler<HTMLButtonElement>}
          className={`bottom-menu-item${classes ? ` ${classes}` : ''}`}
        >
          {children}
        </button>
      )}
      {type === 'a' && (
        <a
          className={`bottom-menu-item${classes ? ` ${classes}` : ''}`}
          href={href}
          rel={rel ?? 'noopener noreferrer'}
          target={target ?? '_blank'}
        >
          {children}
        </a>
      )}
    </Fragment>
  );
}
