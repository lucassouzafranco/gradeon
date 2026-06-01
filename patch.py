import sys

def main():
    artigo_path = 'c:\\Users\\lucas\\Documents\\gradeon\\artigo.tex'
    nova_estrutura_path = 'c:\\Users\\lucas\\Documents\\gradeon\\nova_estrutura.tex'

    # Read original
    with open(artigo_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # The block to keep ends at line 523 (index 522)
    # Let's find exactly the line: \subsection{Casos de Uso e Validação do Modelo de Balanceamento}
    keep_until_index = 0
    for i, line in enumerate(lines):
        if r'\subsection{Casos de Uso e Validação do Modelo de Balanceamento}' in line:
            keep_until_index = i
            break

    if keep_until_index == 0:
        print("Could not find the cutoff point!")
        sys.exit(1)

    # Read new structure
    with open(nova_estrutura_path, 'r', encoding='utf-8') as f:
        new_content = f.read()

    # Combine
    final_lines = lines[:keep_until_index]
    
    with open(artigo_path, 'w', encoding='utf-8') as f:
        f.writelines(final_lines)
        f.write(new_content)
        
    print("Replacement successful! Kept original lines up to", keep_until_index)

if __name__ == '__main__':
    main()
