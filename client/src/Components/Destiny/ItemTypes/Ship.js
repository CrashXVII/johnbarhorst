import React from 'react';
import Sockets from '../Sockets';
import { useToggle } from '../../../Hooks';
import { ItemIcon, ItemWrapper, ItemCard } from '../../../Elements';


export const Ship = ({ icon, masterwork, sockets, name, itemTypeDisplayName, screenshot }) => {
  const [isExpanded, toggleExpanded] = useToggle(false, true);
  return (
    <ItemWrapper>
      <ItemCard
        onClick={() => toggleExpanded(isExpanded => !isExpanded)}
        background={screenshot}
        className={isExpanded && 'isExpanded'}
      >
        <ItemIcon src={`https://www.bungie.net${icon}`} isMasterworked={masterwork} />
        <div>
          <p><strong>{name}</strong></p>
          <p>{itemTypeDisplayName}</p>
        </div>
        <Sockets sockets={sockets} isExpanded={isExpanded} />
      </ItemCard>
    </ItemWrapper>
  )
}
