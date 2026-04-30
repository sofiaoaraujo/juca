const IMAGENS_ALIMENTOS: Record<string, any> = {
  'abacate':        require('../assets/images/abacate.png'),
  'abobrinha':      require('../assets/images/abobrinha.png'),
  'açaí':           require('../assets/images/acai.png'),
  'acai':           require('../assets/images/acai.png'),
  'alface':         require('../assets/images/alface.png'),
  'arroz':          require('../assets/images/arroz.png'),
  'banana':         require('../assets/images/banana.png'),
  'batata-doce':    require('../assets/images/batata-doce.png'),
  'batata doce':    require('../assets/images/batata-doce.png'),
  'batata':         require('../assets/images/batata.png'),
  'beterraba':      require('../assets/images/beterraba.png'),
  'brócolis':       require('../assets/images/brocolis.png'),
  'brocolis':       require('../assets/images/brocolis.png'),
  'carne moída':    require('../assets/images/carne-moida.png'),
  'carne moida':    require('../assets/images/carne-moida.png'),
  'carne':          require('../assets/images/carne.png'),
  'cenoura':        require('../assets/images/cenoura.png'),
  'chuchu':         require('../assets/images/chuchu.png'),
  'couve':          require('../assets/images/couve.png'),
  'cuscuz':         require('../assets/images/cuscuz.png'),
  'feijão':         require('../assets/images/feijao.png'),
  'feijao':         require('../assets/images/feijao.png'),
  'frango':         require('../assets/images/frango.png'),
  'goiaba':         require('../assets/images/goiaba.png'),
  'grão-de-bico':   require('../assets/images/grao-de-bico.png'),
  'grao de bico':   require('../assets/images/grao-de-bico.png'),
  'inhame':         require('../assets/images/inhame.png'),
  'laranja':        require('../assets/images/laranja.png'),
  'lentilha':       require('../assets/images/lentilha.png'),
  'maçã':           require('../assets/images/maca.png'),
  'maca':           require('../assets/images/maca.png'),
  'macarrão':       require('../assets/images/macarrao.png'),
  'macarrao':       require('../assets/images/macarrao.png'),
  'mamão':          require('../assets/images/mamao.png'),
  'mamao':          require('../assets/images/mamao.png'),
  'mandioca':       require('../assets/images/mandioca.png'),
  'manga':          require('../assets/images/manga.png'),
  'melancia':       require('../assets/images/melancia.png'),
  'melão':          require('../assets/images/melao.png'),
  'melao':          require('../assets/images/melao.png'),
  'morango':        require('../assets/images/morango.png'),
  'ovo':            require('../assets/images/ovo.png'),
  'pão':            require('../assets/images/pao.png'),
  'pao':            require('../assets/images/pao.png'),
  'peixe':          require('../assets/images/peixe.png'),
  'tilápia':        require('../assets/images/peixe.png'),
  'tilacia':        require('../assets/images/peixe.png'),
  'salmão':         require('../assets/images/peixe.png'),
  'atum':           require('../assets/images/peixe.png'),
  'queijo':         require('../assets/images/queijo.png'),
  'tapioca':        require('../assets/images/tapioca.png'),
  'tomate':         require('../assets/images/tomate.png'),
  'uva':            require('../assets/images/uva.png'),
};

const IMAGENS_CATEGORIA: Record<string, any> = {
  'Fruta':       require('../assets/images/banana.png'),
  'Legume':      require('../assets/images/cenoura.png'),
  'Verdura':     require('../assets/images/alface.png'),
  'Proteína':    require('../assets/images/frango.png'),
  'Carboidrato': require('../assets/images/arroz.png'),
  'Laticínio':   require('../assets/images/queijo.png'),
};

export function resolverImagem(nome: string, categoria = ''): any {
  const nomeLower = nome.toLowerCase();
  if (IMAGENS_ALIMENTOS[nomeLower]) return IMAGENS_ALIMENTOS[nomeLower];
  const keys = Object.keys(IMAGENS_ALIMENTOS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (nomeLower.includes(key)) return IMAGENS_ALIMENTOS[key];
  }
  return IMAGENS_CATEGORIA[categoria] ?? require('../assets/images/frango.png');
}
