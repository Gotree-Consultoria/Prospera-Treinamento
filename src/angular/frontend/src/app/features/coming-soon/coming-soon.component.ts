import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'pros-coming-soon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coming-soon.component.html',
  styleUrls: ['./coming-soon.component.scss']
})
export class ComingSoonComponent {
  @Input() title = 'Em breve';
  @Input() description = 'Estamos trabalhando para trazer esta seção para a nova plataforma.';
}
