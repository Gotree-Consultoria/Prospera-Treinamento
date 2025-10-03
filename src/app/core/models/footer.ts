export interface FooterLink {
  label: string;
  route?: string;
  externalUrl?: string;
  queryParams?: Record<string, string | number | boolean>;
  iconClass?: string; // legado (Font Awesome)
  svg?: string; // opcional: markup SVG inline para ícone custom
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}
