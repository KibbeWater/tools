import { FontAwesomeIcon, type FontAwesomeIconProps } from '@fortawesome/react-fontawesome';

interface IconProps extends Omit<FontAwesomeIconProps, 'size'> {
  /** Pixel size, applied as font-size so the glyph scales with it. */
  size?: number;
}

export function Icon({ size = 14, style, ...rest }: IconProps) {
  return <FontAwesomeIcon aria-hidden fixedWidth style={{ fontSize: size, ...style }} {...rest} />;
}
